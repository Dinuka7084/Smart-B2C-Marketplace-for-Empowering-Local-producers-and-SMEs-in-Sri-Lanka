import { and, count, desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth, requireRole, type AuthContext } from '../auth/middleware.ts';
import { getDb } from '../db/client.ts';
import {
  categories,
  checkoutOrders,
  complaints,
  inventory,
  notifications,
  orderItems,
  products,
  reviews,
  vendorProfiles,
  vendorOrders,
  wishlistItems,
  wishlists,
} from '../db/schema.ts';
import { engagementId, wishlistItemSchema } from '../engagement/validation.ts';
import { AppError } from '../errors/app-error.ts';
import { complaintInputSchema, reviewInputSchema } from '../support/validation.ts';

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

const deliveredOrderItem = async (customerId: string, productId: string) => {
  const [item] = await getDb()
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(vendorOrders, eq(vendorOrders.id, orderItems.vendorOrderId))
    .innerJoin(checkoutOrders, eq(checkoutOrders.id, vendorOrders.checkoutOrderId))
    .where(and(eq(checkoutOrders.customerId, customerId), eq(orderItems.productId, productId), eq(vendorOrders.status, 'delivered')))
    .orderBy(desc(checkoutOrders.createdAt))
    .limit(1);
  return item;
};

customerEngagementRouter.get('/reviews/eligibility/:productId', async (request, response) => {
  const parsed = engagementId(request.params.productId);
  if (!parsed.success) throw new AppError('Product id is invalid.', 400, 'INVALID_PRODUCT_ID');
  const auth = response.locals.auth as AuthContext;
  const [item, existing] = await Promise.all([
    deliveredOrderItem(auth.userId, parsed.data),
    getDb().select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, status: reviews.status }).from(reviews).where(and(eq(reviews.customerId, auth.userId), eq(reviews.productId, parsed.data))).limit(1),
  ]);
  response.json({ eligible: Boolean(item) && existing.length === 0, review: existing[0] ?? null });
});

customerEngagementRouter.post('/reviews', async (request, response) => {
  const parsed = reviewInputSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError('Review details are invalid.', 400, 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  const auth = response.locals.auth as AuthContext;
  const item = await deliveredOrderItem(auth.userId, parsed.data.productId);
  if (!item) throw new AppError('Only delivered purchases can be reviewed.', 403, 'REVIEW_NOT_ELIGIBLE');
  const [review] = await getDb()
    .insert(reviews)
    .values({ customerId: auth.userId, productId: parsed.data.productId, orderItemId: item.id, rating: parsed.data.rating, comment: parsed.data.comment })
    .onConflictDoNothing()
    .returning({ id: reviews.id, status: reviews.status });
  if (!review) throw new AppError('You have already reviewed this product.', 409, 'REVIEW_ALREADY_EXISTS');
  response.status(201).json({ review });
});

customerEngagementRouter.get('/complaints', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const records = await getDb()
    .select({
      id: complaints.id,
      checkoutOrderId: complaints.checkoutOrderId,
      orderReference: checkoutOrders.reference,
      subject: complaints.subject,
      description: complaints.description,
      status: complaints.status,
      resolutionNote: complaints.resolutionNote,
      createdAt: complaints.createdAt,
      updatedAt: complaints.updatedAt,
    })
    .from(complaints)
    .innerJoin(checkoutOrders, eq(checkoutOrders.id, complaints.checkoutOrderId))
    .where(eq(complaints.customerId, auth.userId))
    .orderBy(desc(complaints.createdAt));
  response.json({ complaints: records });
});

customerEngagementRouter.post('/complaints', async (request, response) => {
  const parsed = complaintInputSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError('Complaint details are invalid.', 400, 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  const auth = response.locals.auth as AuthContext;
  const [order] = await getDb().select({ id: checkoutOrders.id }).from(checkoutOrders).where(and(eq(checkoutOrders.id, parsed.data.checkoutOrderId), eq(checkoutOrders.customerId, auth.userId))).limit(1);
  if (!order) throw new AppError('Order was not found.', 404, 'ORDER_NOT_FOUND');
  const [complaint] = await getDb()
    .insert(complaints)
    .values({ customerId: auth.userId, checkoutOrderId: order.id, subject: parsed.data.subject, description: parsed.data.description })
    .returning({ id: complaints.id, status: complaints.status, createdAt: complaints.createdAt });
  response.status(201).json({ complaint });
});
