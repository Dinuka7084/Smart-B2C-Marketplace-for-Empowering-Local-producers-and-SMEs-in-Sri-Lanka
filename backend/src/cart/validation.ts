import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(100),
});
