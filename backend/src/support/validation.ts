import { z } from 'zod';

export const reviewInputSchema = z.object({
  productId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1000),
});

export const reviewDecisionSchema = z.object({
  status: z.enum(['published', 'rejected']),
});

export const complaintInputSchema = z.object({
  checkoutOrderId: z.uuid(),
  subject: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(3000),
});

export const complaintDecisionSchema = z
  .object({
    status: z.enum(['in_review', 'resolved', 'dismissed']),
    resolutionNote: z.string().trim().max(2000).optional(),
  })
  .refine(
    (value) =>
      value.status === 'in_review' || (value.resolutionNote?.length ?? 0) >= 3,
    { path: ['resolutionNote'], message: 'A resolution note is required.' },
  );
