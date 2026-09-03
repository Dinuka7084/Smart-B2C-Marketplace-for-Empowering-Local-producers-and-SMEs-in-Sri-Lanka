import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['customer', 'vendor', 'admin']);
export const userStatus = pgEnum('user_status', ['active', 'suspended']);
export const vendorApprovalStatus = pgEnum('vendor_approval_status', [
  'pending',
  'approved',
  'rejected',
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

export type UserRole = (typeof userRole.enumValues)[number];
export type VendorApprovalStatus =
  (typeof vendorApprovalStatus.enumValues)[number];
