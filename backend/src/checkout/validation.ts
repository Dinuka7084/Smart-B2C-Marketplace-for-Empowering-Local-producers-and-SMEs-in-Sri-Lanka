import { z } from 'zod';

export const addressInputSchema = z.object({
  label: z.string().trim().min(2).max(60).default('Delivery'),
  recipientName: z.string().trim().min(3).max(160),
  phone: z.string().trim().min(7).max(32),
  line1: z.string().trim().min(5).max(200),
  line2: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(200).optional(),
  ),
  city: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  postalCode: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(20).optional(),
  ),
  isDefault: z.boolean().default(false),
});

export const checkoutInputSchema = z.object({
  addressId: z.uuid(),
  paymentMethod: z.literal('simulated'),
  idempotencyKey: z.uuid(),
});
