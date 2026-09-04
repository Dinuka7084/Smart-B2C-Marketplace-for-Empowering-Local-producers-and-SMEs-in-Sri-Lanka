import { and, count, desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth, requireRole, type AuthContext } from '../auth/middleware.ts';
import { getDb, getSqlClient } from '../db/client.ts';
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
import { explainRecommendation, recommendationStrategy } from '../recommendations/strategy.ts';

export const customerEngagementRouter = Router();

customerEngagementRouter.use(requireAuth, requireRole('customer'));

customerEngagementRouter.get('/recommendations', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const rows = await getSqlClient()`
    WITH category_affinity AS (
      SELECT category_id, SUM(weight)::int AS affinity
      FROM (
        SELECT p.category_id, 3 AS weight
        FROM wishlist_items wi
        INNER JOIN wishlists w ON w.id = wi.wishlist_id
        INNER JOIN products p ON p.id = wi.product_id
        WHERE w.user_id = ${auth.userId}
        UNION ALL
        SELECT p.category_id, GREATEST(oi.quantity, 1) * 5 AS weight
        FROM checkout_orders co
        INNER JOIN vendor_orders vo ON vo.checkout_order_id = co.id
        INNER JOIN order_items oi ON oi.vendor_order_id = vo.id
        INNER JOIN products p ON p.id = oi.product_id
        WHERE co.customer_id = ${auth.userId} AND vo.status <> 'cancelled'
      ) signals
      GROUP BY category_id
    ), popularity AS (
      SELECT oi.product_id, SUM(oi.quantity)::int AS units_sold
      FROM order_items oi
      INNER JOIN vendor_orders vo ON vo.id = oi.vendor_order_id
      WHERE vo.status = 'delivered' AND vo.created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY oi.product_id
    )
    SELECT p.id, p.name, p.slug, p.description, p.price_cents, p.currency,
      p.image_url, p.published_at, c.name AS category_name, c.slug AS category_slug,
      v.business_name, v.store_slug, i.available_quantity,
      COALESCE(a.affinity, 0)::int AS category_affinity,
      COALESCE(pop.units_sold, 0)::int AS recent_units_sold,
      (p.published_at >= NOW() - INTERVAL '14 days') AS published_recently,
      (COALESCE(a.affinity, 0) * 100 + LEAST(COALESCE(pop.units_sold, 0), 50) * 4 +
        CASE WHEN p.published_at >= NOW() - INTERVAL '14 days' THEN 10 ELSE 0 END)::int AS score
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    INNER JOIN vendor_profiles v ON v.id = p.vendor_id
    INNER JOIN inventory i ON i.product_id = p.id
    LEFT JOIN category_affinity a ON a.category_id = p.category_id
    LEFT JOIN popularity pop ON pop.product_id = p.id
    WHERE p.status = 'published' AND c.is_active = TRUE
      AND v.approval_status = 'approved' AND i.available_quantity > 0
    ORDER BY score DESC, p.published_at DESC NULLS LAST, p.id
    LIMIT 8
  `;

  const records = (Array.isArray(rows) ? rows : []) as Array<Record<string, string | number | boolean | null>>;
  response.json({
    recommendations: {
      strategy: recommendationStrategy,
      products: records.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        priceCents: row.price_cents,
        currency: row.currency,
        imageUrl: row.image_url,
        publishedAt: row.published_at,
        category: { name: row.category_name, slug: row.category_slug },
        vendor: { businessName: row.business_name, storeSlug: row.store_slug },
        availableQuantity: row.available_quantity,
        reason: explainRecommendation({
          categoryAffinity: Number(row.category_affinity),
          recentUnitsSold: Number(row.recent_units_sold),
          publishedRecently: Boolean(row.published_recently),
        }, String(row.category_name)),
      })),
    },
  });
});

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
