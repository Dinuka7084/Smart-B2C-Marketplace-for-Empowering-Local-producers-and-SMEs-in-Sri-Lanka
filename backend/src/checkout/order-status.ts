import { z } from 'zod';

export type FulfilmentStatus =
  | 'placed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export const allowedOrderTransitions: Record<
  FulfilmentStatus,
  FulfilmentStatus[]
> = {
  placed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const vendorOrderStatusSchema = z
  .object({
    nextStatus: z.enum([
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ]),
    note: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().min(3).max(500).optional(),
    ),
  })
  .superRefine((value, context) => {
    if (value.nextStatus === 'cancelled' && !value.note) {
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Add a reason when cancelling an order',
      });
    }
  });

export const canTransitionOrder = (
  current: FulfilmentStatus,
  next: FulfilmentStatus,
): boolean => allowedOrderTransitions[current].includes(next);
