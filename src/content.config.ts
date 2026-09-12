import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
  }),
});

export const collections = {
  paintings: paintingsCollection,
};