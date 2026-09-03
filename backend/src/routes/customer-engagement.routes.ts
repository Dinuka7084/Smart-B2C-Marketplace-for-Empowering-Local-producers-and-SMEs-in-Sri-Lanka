import { and, count, desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth, requireRole, type AuthContext } from '../auth/middleware.ts';
import { getDb } from '../db/client.ts';
import {
  categories,
  inventory,
  notifications,
  products,
  vendorProfiles,
  wishlistItems,
  wishlists,
} from '../db/schema.ts';
import { engagementId, wishlistItemSchema } from '../engagement/validation.ts';
import { AppError } from '../errors/app-error.ts';

export const customerEngagementRouter = Router();

customerEngagementRouter.use(requireAuth, requireRole('customer'));

customerEngagementRouter.get('/wishlist', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const items = await getDb()
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      priceCents: products.priceCents,
      currency: products.currency,
      imageUrl: products.imageUrl,
      category: { name: categories.name, slug: categories.slug },
      vendor: {
        businessName: vendorProfiles.businessName,
        storeSlug: vendorProfiles.storeSlug,
      },
      availableQuantity: inventory.availableQuantity,
      publishedAt: products.publishedAt,
      savedAt: wishlistItems.createdAt,
    })
    .from(wishlistItems)
    .innerJoin(wishlists, eq(wishlists.id, wishlistItems.wishlistId))
    .innerJoin(products, eq(products.id, wishlistItems.productId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, products.vendorId))
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .where(eq(wishlists.userId, auth.userId))
    .orderBy(desc(wishlistItems.createdAt));

  response.json({ items });
});

customerEngagementRouter.post('/wishlist/items', async (request, response) => {
  const parsed = wishlistItemSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('Wishlist item is invalid.', 400, 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const auth = response.locals.auth as AuthContext;
  const db = getDb();
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, products.vendorId))
    .where(
      and(
        eq(products.id, parsed.data.productId),
        eq(products.status, 'published'),
        eq(categories.isActive, true),
        eq(vendorProfiles.approvalStatus, 'approved'),
      ),
    )
    .limit(1);
  if (!product) throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');

  const [wishlist] = await db
    .insert(wishlists)
    .values({ userId: auth.userId })
    .onConflictDoUpdate({
      target: wishlists.userId,
      set: { updatedAt: new Date() },
    })
    .returning({ id: wishlists.id });

  await db
    .insert(wishlistItems)
    .values({ wishlistId: wishlist!.id, productId: product.id })
    .onConflictDoNothing();

  response.status(201).json({ saved: true, productId: product.id });
});

customerEngagementRouter.get('/wishlist/items/:productId', async (request, response) => {
  const parsed = engagementId(request.params.productId);
  if (!parsed.success) throw new AppError('Product id is invalid.', 400, 'INVALID_PRODUCT_ID');
  const auth = response.locals.auth as AuthContext;
  const [record] = await getDb()
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .innerJoin(wishlists, eq(wishlists.id, wishlistItems.wishlistId))
    .where(and(eq(wishlists.userId, auth.userId), eq(wishlistItems.productId, parsed.data)))
    .limit(1);
  response.json({ saved: Boolean(record) });
});

customerEngagementRouter.delete('/wishlist/items/:productId', async (request, response) => {
  const parsed = engagementId(request.params.productId);
  if (!parsed.success) throw new AppError('Product id is invalid.', 400, 'INVALID_PRODUCT_ID');
  const auth = response.locals.auth as AuthContext;
  const [wishlist] = await getDb()
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(eq(wishlists.userId, auth.userId))
    .limit(1);
  if (wishlist) {
    await getDb().delete(wishlistItems).where(and(eq(wishlistItems.wishlistId, wishlist.id), eq(wishlistItems.productId, parsed.data)));
  }
  response.status(204).send();
});

customerEngagementRouter.get('/notifications', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const db = getDb();
  const [records, unread] = await Promise.all([
    db.select().from(notifications).where(eq(notifications.userId, auth.userId)).orderBy(desc(notifications.createdAt)).limit(50),
    db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, auth.userId), eq(notifications.isRead, false))),
  ]);
  response.json({ notifications: records, unreadCount: unread[0]?.value ?? 0 });
});

customerEngagementRouter.patch('/notifications/read-all', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  await getDb().update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, auth.userId), eq(notifications.isRead, false)));
  response.json({ unreadCount: 0 });
});

customerEngagementRouter.patch('/notifications/:notificationId/read', async (request, response) => {
  const parsed = engagementId(request.params.notificationId);
  if (!parsed.success) throw new AppError('Notification id is invalid.', 400, 'INVALID_NOTIFICATION_ID');
  const auth = response.locals.auth as AuthContext;
  const [record] = await getDb()
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, parsed.data), eq(notifications.userId, auth.userId)))
    .returning({ id: notifications.id });
  if (!record) throw new AppError('Notification was not found.', 404, 'NOTIFICATION_NOT_FOUND');
  response.json({ notification: { id: record.id, isRead: true } });
});
