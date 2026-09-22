import Stripe from 'stripe';
import fs from 'node:fs';
import path from 'node:path';

const apiKey = process.env.STRIPE_SECRET_KEY;
// Required for Stripe images: Stripe needs a fully qualified public URL
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://tahsinloqman.com').replace(/\/$/, '');

if (!apiKey) {
  console.error('❌ FATAL: STRIPE_SECRET_KEY environment variable is not defined.');
  process.exit(1);
}

const stripe = new Stripe(apiKey);
const PAINTINGS_DIR = path.resolve('src/content/paintings');

async function resolveStripeLinks() {
  // 1. Fetch active payment links from Stripe with line_items expanded
  const stripeLinks = await stripe.paymentLinks.list({
    active: true,
    limit: 100,
    expand: ['data.line_items'],
  });

  const activeLinkMap = new Map();
  for (const link of stripeLinks.data) {
    const optionKey = link.metadata?.option_key;
    if (optionKey) {
      activeLinkMap.set(optionKey, link);
    }
  }

  const files = fs.readdirSync(PAINTINGS_DIR).filter((f) => f.endsWith('.json'));
  const activeOptionKeys = new Set();

  // 2. Process local JSON entries in src/content/paintings/
  for (const file of files) {
    const filePath = path.join(PAINTINGS_DIR, file);
    const item = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const itemId = file.replace(/\.json$/, '');

    if (item.for_sale && item.sale_options?.length > 0) {
      // Build absolute image URL for Stripe checkout page
      const imageUrl = item.image.startsWith('http')
        ? item.image
        : `${SITE_URL}${item.image.startsWith('/') ? '' : '/'}${item.image}`;

      item.sale_options = await Promise.all(
        item.sale_options.map(async (option, index) => {
          const optionKey = `${itemId}:${index}`;
          activeOptionKeys.add(optionKey);

          const expectedAmountCents = Math.round(option.price * 100);
          const existingLink = activeLinkMap.get(optionKey);

          if (existingLink) {
            const currentLineItem = existingLink.line_items?.data[0];
            const currentPriceCents = currentLineItem?.price?.unit_amount;

            const productId = typeof currentLineItem.price.product === 'string'
              ? currentLineItem.price.product
              : currentLineItem.price.product.id;

            // Retroactively update Product metadata & image on existing listings
            await stripe.products.update(productId, {
              name: `${item.title} — ${option.medium}`,
              images: [imageUrl],
            });

            // Re-use existing link if price is unchanged
            if (currentPriceCents === expectedAmountCents) {
              console.log(`ℹ️ Price unchanged for ${optionKey}. Updated product metadata/images.`);
              return { ...option, checkout_url: existingLink.url };
            }

            console.log(`🔄 Price changed for ${optionKey} ($${currentPriceCents / 100} ➔ $${option.price}). Updating Stripe link...`);

            // Deactivate old payment link
            await stripe.paymentLinks.update(existingLink.id, { active: false });

            // Create new Price object with updated amount
            const newPrice = await stripe.prices.create({
              product: productId,
              unit_amount: expectedAmountCents,
              currency: 'usd',
            });

            // Create replacement Payment Link
            const newLink = await stripe.paymentLinks.create({
              line_items: [{ price: newPrice.id, quantity: 1 }],
              metadata: { item_id: itemId, option_key: optionKey },
            });

            console.log(`✅ Updated Stripe link for ${optionKey} ($${option.price})`);
            return { ...option, checkout_url: newLink.url };
          }

          // BRAND NEW LINK CREATION
          const product = await stripe.products.create({
            name: `${item.title} — ${option.medium}`,
            images: [imageUrl],
            metadata: { item_id: itemId, option_key: optionKey },
          });

          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: expectedAmountCents,
            currency: 'usd',
          });

          const newLink = await stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: 1 }],
            metadata: { item_id: itemId, option_key: optionKey },
          });

          console.log(`✅ Created Stripe link for ${optionKey} ($${option.price})`);
          return { ...option, checkout_url: newLink.url };
        })
      );

      // Save updated data to JSON file in GitHub Actions runner memory
      fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
    }
  }

  // 3. Deactivate orphan links (items no longer marked for sale or deleted)
  for (const [optionKey, link] of activeLinkMap.entries()) {
    if (!activeOptionKeys.has(optionKey)) {
      await stripe.paymentLinks.update(link.id, { active: false });
      console.log(`🧹 Deactivated orphan Stripe link: ${optionKey}`);
    }
  }
}

// Top-level execution wrapper to catch API/permission errors and fail the workflow step
resolveStripeLinks()
  .then(() => {
    console.log('✅ Stripe link resolution completed successfully.');
  })
  .catch((err) => {
    console.error('❌ FATAL: Stripe Link Resolution Failed!');
    console.error(err);
    process.exit(1);
  });