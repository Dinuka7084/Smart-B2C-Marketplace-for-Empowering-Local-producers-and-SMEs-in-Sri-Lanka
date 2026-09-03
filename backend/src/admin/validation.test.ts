import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminProductStatusSchema,
  categoryInputSchema,
  categoryUpdateSchema,
  userStatusSchema,
} from './validation.ts';

test('categories require a normalized URL slug', () => {
  assert.equal(categoryInputSchema.safeParse({ name: 'Home goods', slug: 'Home Goods' }).success, false);
  assert.equal(categoryInputSchema.safeParse({ name: 'Home goods', slug: 'home-goods' }).success, true);
});

test('empty category updates are rejected', () => {
  assert.equal(categoryUpdateSchema.safeParse({}).success, false);
});

test('account and product states use constrained values', () => {
  assert.equal(userStatusSchema.safeParse({ status: 'deleted' }).success, false);
  assert.equal(adminProductStatusSchema.safeParse({ status: 'archived' }).success, true);
});
