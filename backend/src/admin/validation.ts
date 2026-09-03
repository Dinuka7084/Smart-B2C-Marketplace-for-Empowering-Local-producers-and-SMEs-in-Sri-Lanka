import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens only');

const categoryFields = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().max(1000).optional(),
});

export const categoryInputSchema = categoryFields.extend({
  isActive: z.boolean().default(true),
});

export const categoryUpdateSchema = categoryFields.extend({
  isActive: z.boolean(),
}).partial().refine(
  (value) => Object.keys(value).length > 0,
  'Provide at least one category field.',
);

export const userStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export const adminProductStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});
