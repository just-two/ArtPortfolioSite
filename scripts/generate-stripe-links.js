import Stripe from 'stripe';
import fs from 'node:fs';
import path from 'node:path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PAINTINGS_DIR = path.resolve('src/content/paintings');

async function resolveStripeLinks() {
  // 1. Query existing active links from Stripe
  const stripeLinks = await stripe.paymentLinks.list({ active: true, limit: 100 });
  const activeLinkMap = new Map();

  for (const link of stripeLinks.data) {
    const optionKey = link.metadata?.option_key; // Format: "twilight-sky:0" or "twilight-sky:original"
    if (optionKey) {
      activeLinkMap.set(optionKey, link);
    }
  }

  const files = fs.readdirSync(PAINTINGS_DIR).filter((f) => f.endsWith('.json'));
  const activeOptionKeys = new Set();

  // 2. Iterate through local artwork files
  for (const file of files) {
    const filePath = path.join(PAINTINGS_DIR, file);
    const item = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const itemId = file.replace(/\.json$/, '');

    if (item.for_sale && item.sale_options?.length > 0) {
      item.sale_options = await Promise.all(
        item.sale_options.map(async (option, index) => {
          const optionKey = `${itemId}:${index}`;
          activeOptionKeys.add(optionKey);

          let checkoutUrl = activeLinkMap.get(optionKey)?.url;

          // If no active link exists for this option, create one
          if (!checkoutUrl) {
            const product = await stripe.products.create({
              name: `${item.title} — ${option.medium}`,
              metadata: { item_id: itemId, option_key: optionKey },
            });

            const price = await stripe.prices.create({
              product: product.id,
              unit_amount: option.price * 100,
              currency: 'usd',
            });

            const newLink = await stripe.paymentLinks.create({
              line_items: [{ price: price.id, quantity: 1 }],
              metadata: { item_id: itemId, option_key: optionKey },
            });

            checkoutUrl = newLink.url;
            console.log(`Created Stripe link for ${optionKey} ($${option.price})`);
          }

          return { ...option, checkout_url: checkoutUrl };
        })
      );

      // Write updated data to JSON file in GitHub Actions runner memory
      fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
    }
  }

  // 3. Deactivate links for options that no longer exist or were removed
  for (const [optionKey, link] of activeLinkMap.entries()) {
    if (!activeOptionKeys.has(optionKey)) {
      await stripe.paymentLinks.update(link.id, { active: false });
      console.log(`Deactivated orphan/removed Stripe link: ${optionKey}`);
    }
  }
}

resolveStripeLinks().catch(console.error);