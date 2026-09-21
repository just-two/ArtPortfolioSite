import Stripe from 'stripe';
import fs from 'node:fs';
import path from 'node:path';

const apiKey = process.env.STRIPE_SECRET_KEY;

if (!apiKey) {
  console.error('❌ FATAL: STRIPE_SECRET_KEY environment variable is not defined.');
  process.exit(1);
}

const stripe = new Stripe(apiKey);
const PAINTINGS_DIR = path.resolve('src/content/paintings');

async function resolveStripeLinks() {
  // 1. Fetch active payment links from Stripe
  const stripeLinks = await stripe.paymentLinks.list({ active: true, limit: 100 });
  const activeLinkMap = new Map();

  for (const link of stripeLinks.data) {
    const optionKey = link.metadata?.option_key;
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

          if (!checkoutUrl) {
            const product = await stripe.products.create({
              name: `${item.title} — ${option.medium}`,
              metadata: { item_id: itemId, option_key: optionKey },
            });

            const price = await stripe.prices.create({
              product: product.id,
              unit_amount: Math.round(option.price * 100),
              currency: 'usd',
            });

            const newLink = await stripe.paymentLinks.create({
              line_items: [{ price: price.id, quantity: 1 }],
              metadata: { item_id: itemId, option_key: optionKey },
            });

            checkoutUrl = newLink.url;
            console.log(`✅ Created Stripe link for ${optionKey} ($${option.price})`);
          }

          return { ...option, checkout_url: checkoutUrl };
        })
      );

      fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
    }
  }

  // 3. Deactivate orphan links
  for (const [optionKey, link] of activeLinkMap.entries()) {
    if (!activeOptionKeys.has(optionKey)) {
      await stripe.paymentLinks.update(link.id, { active: false });
      console.log(`🧹 Deactivated orphan Stripe link: ${optionKey}`);
    }
  }
}

// Top-level execution wrapper to catch API permission/network errors
resolveStripeLinks()
  .then(() => {
    console.log('✅ Stripe link resolution completed successfully.');
  })
  .catch((err) => {
    console.error('❌ FATAL: Stripe Link Resolution Failed!');
    console.error(err);
    process.exit(1); // Forces GitHub Actions step to FAIL
  });