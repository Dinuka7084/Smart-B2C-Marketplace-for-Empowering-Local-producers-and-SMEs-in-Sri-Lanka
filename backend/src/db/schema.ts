import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userRole = pgEnum('user_role', ['customer', 'vendor', 'admin']);
export const userStatus = pgEnum('user_status', ['active', 'suspended']);
export const vendorApprovalStatus = pgEnum('vendor_approval_status', [
  'pending',
  'approved',
  'rejected',
]);
export const productStatus = pgEnum('product_status', [
  'draft',
  'published',
  'archived',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('customer'),
    status: userStatus('status').notNull().default('active'),
    firstName: varchar('first_name', { length: 80 }).notNull(),
    lastName: varchar('last_name', { length: 80 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export const vendorProfiles = pgTable(
  'vendor_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    businessName: varchar('business_name', { length: 160 }).notNull(),
    storeSlug: varchar('store_slug', { length: 180 }).notNull(),
    registrationNumber: varchar('registration_number', { length: 80 }),
    description: text('description'),
    approvalStatus: vendorApprovalStatus('approval_status')
      .notNull()
      .default('pending'),
    approvedBy: uuid('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('vendor_profiles_user_id_unique').on(table.userId),
    uniqueIndex('vendor_profiles_store_slug_unique').on(table.storeSlug),
    index('vendor_profiles_approval_status_idx').on(table.approvalStatus),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 140 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('categories_slug_unique').on(table.slug)],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 180 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull(),
    sku: varchar('sku', { length: 80 }).notNull(),
    description: text('description').notNull(),
    priceCents: integer('price_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('LKR'),
    status: productStatus('status').notNull().default('draft'),
    imageUrl: text('image_url'),
    imagePublicId: varchar('image_public_id', { length: 255 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('products_slug_unique').on(table.slug),
    uniqueIndex('products_vendor_sku_unique').on(table.vendorId, table.sku),
    index('products_vendor_id_idx').on(table.vendorId),
    index('products_category_id_idx').on(table.categoryId),
    index('products_status_idx').on(table.status),
    check('products_price_positive', sql`${table.priceCents} > 0`),
  ],
);

export const inventory = pgTable(
  'inventory',
  {
    productId: uuid('product_id')
      .primaryKey()
      .references(() => products.id, { onDelete: 'cascade' }),
    availableQuantity: integer('available_quantity').notNull().default(0),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'inventory_available_nonnegative',
      sql`${table.availableQuantity} >= 0`,
    ),
    check(
      'inventory_reserved_nonnegative',
      sql`${table.reservedQuantity} >= 0`,
    ),
    check(
      'inventory_threshold_nonnegative',
      sql`${table.lowStockThreshold} >= 0`,
    ),
  ],
);

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('carts_user_id_unique').on(table.userId)],
);

export const cartItems = pgTable(
  'cart_items',
  {
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.cartId, table.productId] }),
    index('cart_items_product_id_idx').on(table.productId),
    check('cart_items_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

export type UserRole = (typeof userRole.enumValues)[number];
export type VendorApprovalStatus =
  (typeof vendorApprovalStatus.enumValues)[number];
export type ProductStatus = (typeof productStatus.enumValues)[number];
