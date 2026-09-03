import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canTransitionOrder,
  vendorOrderStatusSchema,
} from './order-status.ts';

test('fulfilment follows the placed, processing, shipped, delivered sequence', () => {
  assert.equal(canTransitionOrder('placed', 'processing'), true);
  assert.equal(canTransitionOrder('processing', 'shipped'), true);
  assert.equal(canTransitionOrder('shipped', 'delivered'), true);
  assert.equal(canTransitionOrder('delivered', 'processing'), false);
  assert.equal(canTransitionOrder('placed', 'delivered'), false);
});

test('vendor cancellation requires a reason', () => {
  assert.equal(
    vendorOrderStatusSchema.safeParse({ nextStatus: 'cancelled' }).success,
    false,
  );
  assert.equal(
    vendorOrderStatusSchema.safeParse({
      nextStatus: 'cancelled',
      note: 'Product is damaged',
    }).success,
    true,
  );
});
