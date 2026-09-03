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
export const checkoutOrderStatus = pgEnum('checkout_order_status', [
  'confirmed',
  'cancelled',
]);
export const vendorOrderStatus = pgEnum('vendor_order_status', [
  'placed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);
export const paymentStatus = pgEnum('payment_status', ['paid', 'refunded']);

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

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 60 }).notNull().default('Delivery'),
    recipientName: varchar('recipient_name', { length: 160 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    line1: varchar('line_1', { length: 200 }).notNull(),
    line2: varchar('line_2', { length: 200 }),
    city: varchar('city', { length: 100 }).notNull(),
    district: varchar('district', { length: 100 }).notNull(),
    postalCode: varchar('postal_code', { length: 20 }),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('addresses_user_id_idx').on(table.userId)],
);

export const checkoutOrders = pgTable(
  'checkout_orders',
  {
    id: uuid('id').primaryKey(),
    reference: varchar('reference', { length: 32 }).notNull(),
    idempotencyKey: uuid('idempotency_key').notNull(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    addressId: uuid('address_id').references(() => addresses.id, {
      onDelete: 'set null',
    }),
    status: checkoutOrderStatus('status').notNull().default('confirmed'),
    recipientName: varchar('recipient_name', { length: 160 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    addressLine1: varchar('address_line_1', { length: 200 }).notNull(),
    addressLine2: varchar('address_line_2', { length: 200 }),
    city: varchar('city', { length: 100 }).notNull(),
    district: varchar('district', { length: 100 }).notNull(),
    postalCode: varchar('postal_code', { length: 20 }),
    subtotalCents: integer('subtotal_cents').notNull(),
    deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('LKR'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('checkout_orders_reference_unique').on(table.reference),
    uniqueIndex('checkout_orders_idempotency_key_unique').on(table.idempotencyKey),
    index('checkout_orders_customer_id_idx').on(table.customerId),
    check('checkout_orders_subtotal_nonnegative', sql`${table.subtotalCents} >= 0`),
    check('checkout_orders_delivery_nonnegative', sql`${table.deliveryFeeCents} >= 0`),
    check('checkout_orders_total_nonnegative', sql`${table.totalCents} >= 0`),
  ],
);

export const vendorOrders = pgTable(
  'vendor_orders',
  {
    id: uuid('id').primaryKey(),
    checkoutOrderId: uuid('checkout_order_id')
      .notNull()
      .references(() => checkoutOrders.id, { onDelete: 'cascade' }),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: 'restrict' }),
    status: vendorOrderStatus('status').notNull().default('placed'),
    subtotalCents: integer('subtotal_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('vendor_orders_checkout_id_idx').on(table.checkoutOrderId),
    index('vendor_orders_vendor_id_idx').on(table.vendorId),
    check('vendor_orders_subtotal_nonnegative', sql`${table.subtotalCents} >= 0`),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey(),
    vendorOrderId: uuid('vendor_order_id')
      .notNull()
      .references(() => vendorOrders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    productName: varchar('product_name', { length: 180 }).notNull(),
    sku: varchar('sku', { length: 80 }).notNull(),
    imageUrl: text('image_url'),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
  },
  (table) => [
    index('order_items_vendor_order_id_idx').on(table.vendorOrderId),
    check('order_items_price_positive', sql`${table.unitPriceCents} > 0`),
    check('order_items_quantity_positive', sql`${table.quantity} > 0`),
    check('order_items_total_positive', sql`${table.lineTotalCents} > 0`),
  ],
);

export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: uuid('id').primaryKey(),
    vendorOrderId: uuid('vendor_order_id')
      .notNull()
      .references(() => vendorOrders.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    previousStatus: vendorOrderStatus('previous_status'),
    nextStatus: vendorOrderStatus('next_status').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('order_status_history_vendor_order_id_idx').on(table.vendorOrderId)],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey(),
    checkoutOrderId: uuid('checkout_order_id')
      .notNull()
      .references(() => checkoutOrders.id, { onDelete: 'restrict' }),
    method: varchar('method', { length: 40 }).notNull().default('simulated'),
    status: paymentStatus('status').notNull().default('paid'),
    providerReference: varchar('provider_reference', { length: 80 }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('LKR'),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('payments_checkout_order_id_unique').on(table.checkoutOrderId),
    uniqueIndex('payments_provider_reference_unique').on(table.providerReference),
    check('payments_amount_nonnegative', sql`${table.amountCents} >= 0`),
  ],
);

export type UserRole = (typeof userRole.enumValues)[number];
export type VendorApprovalStatus =
  (typeof vendorApprovalStatus.enumValues)[number];
export type ProductStatus = (typeof productStatus.enumValues)[number];
export type CheckoutOrderStatus = (typeof checkoutOrderStatus.enumValues)[number];
export type VendorOrderStatus = (typeof vendorOrderStatus.enumValues)[number];
