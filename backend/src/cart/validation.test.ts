import assert from 'node:assert/strict';
import test from 'node:test';

import { addCartItemSchema, updateCartItemSchema } from './validation.ts';
import { calculateCartTotals } from './totals.ts';

test('adding a cart item defaults to one unit', () => {
  const result = addCartItemSchema.parse({
    productId: '4d88a4f8-7ed0-4f89-95a0-b6a6db48a932',
  });
  assert.equal(result.quantity, 1);
});

test('cart quantities are positive integers capped at 100', () => {
  assert.equal(updateCartItemSchema.safeParse({ quantity: 0 }).success, false);
  assert.equal(updateCartItemSchema.safeParse({ quantity: 2.5 }).success, false);
  assert.equal(updateCartItemSchema.safeParse({ quantity: 101 }).success, false);
  assert.equal(updateCartItemSchema.safeParse({ quantity: 4 }).success, true);
});

test('cart totals include all units and block unavailable checkouts', () => {
  assert.deepEqual(
    calculateCartTotals([
      { quantity: 2, lineTotalCents: 240_000, isAvailable: true },
      { quantity: 1, lineTotalCents: 85_000, isAvailable: false },
    ]),
    { itemCount: 3, subtotalCents: 325_000, canCheckout: false },
  );
});
