import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const artifacts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/artifacts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    link: z.string().url().optional(),
    showLiveLink: z.boolean().default(false),
    date: z.union([z.string(), z.date()]).optional(),
    showDate: z.boolean().default(false),
    order: z.number().optional(),
    priority: z.number().optional(),
    featured: z.boolean().default(false),
    hidden: z.boolean().default(false),
    previewImage: z.string().optional(),
    metrics: z.string().optional(),
    mediaType: z.enum(['image', 'video', 'document']).default('image'),
    videoUrl: z.string().optional(),
    galleryImages: z.array(z.string()).default([]),
  }),
});

export const collections = { artifacts };
