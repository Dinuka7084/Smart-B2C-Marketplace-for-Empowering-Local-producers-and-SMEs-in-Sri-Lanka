import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lowercase letters, numbers, and single hyphens only',
  );

const optionalQueryText = (maximum: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().min(1).max(maximum).optional(),
  );

export const productInputSchema = z.object({
  name: z.string().trim().min(3).max(180),
  slug: slugSchema,
  sku: z.string().trim().min(2).max(80).toUpperCase(),
  categoryId: z.uuid(),
  description: z.string().trim().min(20).max(5_000),
  priceLkr: z.coerce.number().positive().max(10_000_000),
  status: z.enum(['draft', 'published']).default('draft'),
  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(100_000).default(5),
});

export const productUpdateSchema = productInputSchema
  .omit({ stock: true, lowStockThreshold: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one product field to update',
  });

export const inventoryUpdateSchema = z.object({
  availableQuantity: z.coerce.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(100_000).optional(),
});

export const productImageSchema = z.object({
  imageUrl: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  }, 'Use a secure Cloudinary image URL'),
  imagePublicId: z.string().trim().min(1).max(255),
});

export const catalogQuerySchema = z.object({
  q: optionalQueryText(120),
  category: optionalQueryText(140),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export const priceLkrToCents = (priceLkr: number): number =>
  Math.round(priceLkr * 100);
