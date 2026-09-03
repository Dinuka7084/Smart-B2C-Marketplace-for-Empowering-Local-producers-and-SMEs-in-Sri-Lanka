import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateCheckout, SIMULATED_DELIVERY_FEE_CENTS } from './calculations.ts';
import { addressInputSchema, checkoutInputSchema } from './validation.ts';

test('checkout splits subtotal values by vendor and adds simulated delivery', () => {
  const result = calculateCheckout([
    { vendorId: 'vendor-a', unitPriceCents: 100_000, quantity: 2 },
    { vendorId: 'vendor-b', unitPriceCents: 75_000, quantity: 1 },
  ]);
  assert.equal(result.vendorSubtotals.get('vendor-a'), 200_000);
  assert.equal(result.vendorSubtotals.get('vendor-b'), 75_000);
  assert.equal(result.subtotalCents, 275_000);
  assert.equal(result.deliveryFeeCents, SIMULATED_DELIVERY_FEE_CENTS);
  assert.equal(result.totalCents, 310_000);
});

test('checkout requires a saved address and UUID idempotency key', () => {
  assert.equal(checkoutInputSchema.safeParse({ addressId: 'bad', paymentMethod: 'simulated', idempotencyKey: 'bad' }).success, false);
});

test('delivery address validation normalizes optional blank fields', () => {
  const address = addressInputSchema.parse({ recipientName: 'Nimali Perera', phone: '0771234567', line1: '12 Temple Road', line2: '', city: 'Kandy', district: 'Kandy', postalCode: '', isDefault: true });
  assert.equal(address.line2, undefined);
  assert.equal(address.postalCode, undefined);
  assert.equal(address.label, 'Delivery');
});
