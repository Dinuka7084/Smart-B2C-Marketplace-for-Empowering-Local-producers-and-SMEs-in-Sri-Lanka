import assert from 'node:assert/strict';
import test from 'node:test';

import { wishlistItemSchema } from './validation.ts';

test('wishlist items require a product UUID', () => {
  assert.equal(wishlistItemSchema.safeParse({ productId: 'product-1' }).success, false);
  assert.equal(
    wishlistItemSchema.safeParse({ productId: '550e8400-e29b-41d4-a716-446655440000' }).success,
    true,
  );
});
