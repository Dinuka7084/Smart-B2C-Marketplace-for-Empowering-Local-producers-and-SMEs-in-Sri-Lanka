import assert from 'node:assert/strict';
import test from 'node:test';

import {
  catalogQuerySchema,
  priceLkrToCents,
  productImageSchema,
  productInputSchema,
} from './validation.ts';

test('product input normalizes SKU and converts LKR to integer cents', () => {
  const result = productInputSchema.parse({
    name: 'Ceylon cinnamon pantry set',
    slug: 'ceylon-cinnamon-pantry-set',
    sku: ' cin-001 ',
    categoryId: '4d88a4f8-7ed0-4f89-95a0-b6a6db48a932',
    description: 'A locally prepared cinnamon selection from Matale.',
    priceLkr: 3450.5,
  });

  assert.equal(result.sku, 'CIN-001');
  assert.equal(priceLkrToCents(result.priceLkr), 345_050);
  assert.equal(result.status, 'draft');
});

test('product input rejects negative stock and malformed slugs', () => {
  const result = productInputSchema.safeParse({
    name: 'Ceylon cinnamon pantry set',
    slug: 'Ceylon Cinnamon',
    sku: 'CIN-001',
    categoryId: '4d88a4f8-7ed0-4f89-95a0-b6a6db48a932',
    description: 'A locally prepared cinnamon selection from Matale.',
    priceLkr: 3450,
    stock: -1,
  });

  assert.equal(result.success, false);
});

test('catalog query applies bounded pagination defaults', () => {
  const result = catalogQuerySchema.parse({});
  assert.deepEqual(result, {
    sort: 'newest',
    page: 1,
    pageSize: 12,
  });
});

test('product images must use secure Cloudinary delivery URLs', () => {
  assert.equal(
    productImageSchema.safeParse({
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/item.jpg',
      imagePublicId: 'smart-lanka/products/vendor/item',
    }).success,
    true,
  );
  assert.equal(
    productImageSchema.safeParse({
      imageUrl: 'https://example.com/item.jpg',
      imagePublicId: 'item',
    }).success,
    false,
  );
});
