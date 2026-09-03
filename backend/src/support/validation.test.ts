import assert from 'node:assert/strict';
import test from 'node:test';

import {
  complaintDecisionSchema,
  complaintInputSchema,
  reviewInputSchema,
} from './validation.ts';

test('reviews require a product, a 1-5 rating, and meaningful text', () => {
  assert.equal(reviewInputSchema.safeParse({ productId: 'bad', rating: 6, comment: 'short' }).success, false);
  assert.equal(reviewInputSchema.safeParse({ productId: '550e8400-e29b-41d4-a716-446655440000', rating: 5, comment: 'Excellent local product.' }).success, true);
});

test('complaints require an owned order reference and useful detail', () => {
  assert.equal(complaintInputSchema.safeParse({ checkoutOrderId: 'bad', subject: 'Late', description: 'Too short' }).success, false);
});

test('terminal complaint decisions require a resolution note', () => {
  assert.equal(complaintDecisionSchema.safeParse({ status: 'resolved' }).success, false);
  assert.equal(complaintDecisionSchema.safeParse({ status: 'in_review' }).success, true);
});
