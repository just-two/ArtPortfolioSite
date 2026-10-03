import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const SITE_CONFIG = {
  title: 'Tahsin — Portfolio',
  description: 'Art portfolio showcasing oil paintings, still lifes, and studio works.',
  inquiryEmail: 'tahsinloqman@gmail.com',
};

const paintingsCollection = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/paintings' }),
  schema: z.object({
    title: z.string(),
    medium: z.string(),
    dimensions: z.string(),
    year: z.number(),
    image: z.string(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    description: z.string().optional(),
    
    // Commerce
    for_sale: z.boolean().default(false),
    sale_options: z.array(
      z.object({
        medium: z.string(), // e.g. "Original", "Limited Edition Print"
        price: z.number().optional(), // Omit when the price is set externally (prints) or negotiated (originals)
        checkout_url: z.string().url().optional(), // Injected in runner memory at build time
        print_url: z.string().url().optional(), // External site where customers can buy prints
      })
    ).optional(),
  }),
});

export const collections = {
  paintings: paintingsCollection,
};