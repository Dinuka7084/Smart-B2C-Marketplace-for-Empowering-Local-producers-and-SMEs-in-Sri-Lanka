import { z } from 'zod';

export const wishlistItemSchema = z.object({
  productId: z.uuid(),
});

export const engagementId = (value: string | undefined) => z.uuid().safeParse(value);
