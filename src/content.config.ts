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
    
    // Commerce / Availability
    for_sale: z.boolean().default(false),
    sale_medium: z.enum(['Original', 'Print', 'Original & Print']).optional(),
    price: z.number().optional(), // In USD
  }),
});

export const collections = {
  paintings: paintingsCollection,
};