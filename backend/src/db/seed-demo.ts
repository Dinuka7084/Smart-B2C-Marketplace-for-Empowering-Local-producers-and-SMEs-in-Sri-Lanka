import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { hashPassword } from '../auth/password.ts';
import {
  addresses,
  categories,
  inventory,
  inventoryMovements,
  products,
  users,
  vendorProfiles,
  wishlistItems,
  wishlists,
} from './schema.ts';
import { getDb } from './client.ts';

const passwordResult = z.string().min(12).max(128).safeParse(process.env.DEMO_SEED_PASSWORD);
if (!passwordResult.success) {
  throw new Error('Set DEMO_SEED_PASSWORD to a non-production password containing 12-128 characters before running the demo seed.');
}

const db = getDb();
const passwordHash = await hashPassword(passwordResult.data);
const categoryRows = await db.select({ id: categories.id, slug: categories.slug }).from(categories).where(inArray(categories.slug, ['spice-pantry', 'home-craft', 'handloom-wear', 'wellness']));
const categoryIds = new Map(categoryRows.map((category) => [category.slug, category.id]));
if (categoryIds.size < 4) throw new Error('Run npm run db:seed before the demo seed so all default categories exist.');

const [customer] = await db.insert(users).values({
  email: 'customer.demo@smartlanka.lk', passwordHash, role: 'customer', status: 'active',
  firstName: 'Nimali', lastName: 'Perera', phone: '+94 77 555 0101',
}).onConflictDoUpdate({
  target: users.email,
  set: { passwordHash, role: 'customer', status: 'active', firstName: 'Nimali', lastName: 'Perera', phone: '+94 77 555 0101', updatedAt: new Date() },
}).returning({ id: users.id });

const [vendorUser] = await db.insert(users).values({
  email: 'vendor.demo@smartlanka.lk', passwordHash, role: 'vendor', status: 'active',
  firstName: 'Kasun', lastName: 'Jayasinghe', phone: '+94 77 555 0202',
}).onConflictDoUpdate({
  target: users.email,
  set: { passwordHash, role: 'vendor', status: 'active', firstName: 'Kasun', lastName: 'Jayasinghe', phone: '+94 77 555 0202', updatedAt: new Date() },
}).returning({ id: users.id });

const [vendor] = await db.insert(vendorProfiles).values({
  userId: vendorUser!.id,
  businessName: 'Lakpura Artisan Collective',
  storeSlug: 'lakpura-artisan-collective-demo',
  registrationNumber: 'DEMO-SME-001',
  description: 'Presentation-ready Smart Lanka vendor showcasing locally made pantry goods and crafts.',
  approvalStatus: 'approved',
  approvedAt: new Date(),
}).onConflictDoUpdate({
  target: vendorProfiles.userId,
  set: {
    businessName: 'Lakpura Artisan Collective', storeSlug: 'lakpura-artisan-collective-demo',
    registrationNumber: 'DEMO-SME-001', description: 'Presentation-ready Smart Lanka vendor showcasing locally made pantry goods and crafts.',
    approvalStatus: 'approved', rejectionReason: null, approvedAt: new Date(), updatedAt: new Date(),
  },
}).returning({ id: vendorProfiles.id });

const demoProducts = [
  { name: 'Matale Ceylon Cinnamon Quills', slug: 'demo-matale-ceylon-cinnamon-quills', sku: 'DEMO-CIN-01', categorySlug: 'spice-pantry', description: 'Carefully selected Ceylon cinnamon quills from Matale, packed in a reusable pouch for everyday tea, baking, and savoury cooking. This demonstration listing highlights clear origin details and practical product information without unsupported claims.', priceCents: 185000, stock: 32, threshold: 8 },
  { name: 'Hand-thrown Clay Tea Cup Pair', slug: 'demo-hand-thrown-clay-tea-cups', sku: 'DEMO-CLAY-02', categorySlug: 'home-craft', description: 'A pair of hand-thrown clay tea cups finished by a small Sri Lankan pottery workshop. Natural variations in tone and form make each pair distinct, while the comfortable shape suits a quiet cup of tea at home.', priceCents: 295000, stock: 14, threshold: 4 },
  { name: 'Gampaha Handloom Table Runner', slug: 'demo-gampaha-handloom-table-runner', sku: 'DEMO-HAND-03', categorySlug: 'handloom-wear', description: 'A small-batch cotton table runner woven in Gampaha with a restrained geometric pattern. The durable weave brings local textile craft to dining tables, sideboards, and thoughtful housewarming gifts.', priceCents: 420000, stock: 9, threshold: 3 },
  { name: 'Coconut and Neem Soap Trio', slug: 'demo-coconut-neem-soap-trio', sku: 'DEMO-SOAP-04', categorySlug: 'wellness', description: 'Three locally produced cleansing bars made with coconut oil and neem. The set is simply wrapped for gifting or everyday household use, with ingredients and care details presented clearly on the package.', priceCents: 165000, stock: 20, threshold: 5 },
] as const;

const seededProductIds: string[] = [];
for (const item of demoProducts) {
  const [product] = await db.insert(products).values({
    vendorId: vendor!.id, categoryId: categoryIds.get(item.categorySlug)!, name: item.name,
    slug: item.slug, sku: item.sku, description: item.description, priceCents: item.priceCents,
    status: 'published', publishedAt: new Date(),
  }).onConflictDoUpdate({
    target: [products.vendorId, products.sku],
    set: { categoryId: categoryIds.get(item.categorySlug)!, name: item.name, slug: item.slug, description: item.description, priceCents: item.priceCents, status: 'published', publishedAt: new Date(), updatedAt: new Date() },
  }).returning({ id: products.id });
  seededProductIds.push(product!.id);

  const [createdInventory] = await db.insert(inventory).values({
    productId: product!.id, availableQuantity: item.stock, lowStockThreshold: item.threshold,
  }).onConflictDoNothing().returning({ productId: inventory.productId });
  if (createdInventory) {
    await db.insert(inventoryMovements).values({
      productId: product!.id, actorUserId: vendorUser!.id, type: 'initial',
      quantityDelta: item.stock, quantityBefore: 0, quantityAfter: item.stock,
      note: 'Presentation demo opening stock',
    });
  }
}

const [wishlist] = await db.insert(wishlists).values({ userId: customer!.id }).onConflictDoUpdate({
  target: wishlists.userId,
  set: { updatedAt: new Date() },
}).returning({ id: wishlists.id });
await db.insert(wishlistItems).values({ wishlistId: wishlist!.id, productId: seededProductIds[0]! }).onConflictDoNothing();

const [demoAddress] = await db.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.userId, customer!.id), eq(addresses.label, 'Demo address'))).limit(1);
if (!demoAddress) {
  await db.insert(addresses).values({
    userId: customer!.id, label: 'Demo address', recipientName: 'Nimali Perera',
    phone: '+94 77 555 0101', line1: '42 Galle Road', city: 'Colombo', district: 'Colombo',
    postalCode: '00300', isDefault: true,
  });
}

console.log('Seeded presentation demo customer, approved vendor, address, wishlist signal, and four products.');
console.log('Demo accounts: customer.demo@smartlanka.lk and vendor.demo@smartlanka.lk');
