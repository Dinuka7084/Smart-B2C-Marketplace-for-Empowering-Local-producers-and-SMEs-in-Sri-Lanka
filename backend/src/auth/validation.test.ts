import assert from 'node:assert/strict';
import test from 'node:test';

import { registerSchema, vendorApprovalSchema } from './validation.ts';

test('customer registration does not accept an administrator role', () => {
  const result = registerSchema.safeParse({
    email: 'person@example.com',
    password: 'A-valid-demo-password-123',
    firstName: 'Nimali',
    lastName: 'Perera',
    role: 'admin',
  });

  assert.equal(result.success, false);
});

test('vendor registration requires business identity fields', () => {
  const result = registerSchema.safeParse({
    email: 'vendor@example.com',
    password: 'A-valid-demo-password-123',
    firstName: 'Kasun',
    lastName: 'Silva',
    role: 'vendor',
  });

  assert.equal(result.success, false);
});

test('vendor rejection requires a reason', () => {
  assert.equal(
    vendorApprovalSchema.safeParse({ status: 'rejected' }).success,
    false,
  );
  assert.equal(
    vendorApprovalSchema.safeParse({
      status: 'rejected',
      reason: 'Registration details could not be verified.',
    }).success,
    true,
  );
});
