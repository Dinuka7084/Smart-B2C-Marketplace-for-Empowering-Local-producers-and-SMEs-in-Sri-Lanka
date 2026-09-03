import { randomUUID } from 'node:crypto';

import { and, asc, count, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireRole, type AuthContext } from '../auth/middleware.ts';
import { vendorApprovalSchema } from '../auth/validation.ts';
import {
  adminProductStatusSchema,
  categoryInputSchema,
  categoryUpdateSchema,
  userStatusSchema,
} from '../admin/validation.ts';
import { getDb, getSqlClient } from '../db/client.ts';
import { categories, checkoutOrders, complaints, inventory, products, reviews, sessions, users, vendorProfiles } from '../db/schema.ts';
import { AppError, isPostgresError } from '../errors/app-error.ts';
import { complaintDecisionSchema, reviewDecisionSchema } from '../support/validation.ts';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/vendors/pending', async (_request, response) => {
  const vendors = await getDb()
    .select({
      userId: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      businessName: vendorProfiles.businessName,
      storeSlug: vendorProfiles.storeSlug,
      registrationNumber: vendorProfiles.registrationNumber,
      description: vendorProfiles.description,
      submittedAt: vendorProfiles.createdAt,
    })
    .from(vendorProfiles)
    .innerJoin(users, eq(users.id, vendorProfiles.userId))
    .where(eq(vendorProfiles.approvalStatus, 'pending'))
    .orderBy(asc(vendorProfiles.createdAt));

  response.json({ vendors });
});

adminRouter.patch('/vendors/:vendorUserId/approval', async (request, response) => {
  const vendorUserId = z.uuid().safeParse(request.params.vendorUserId);
  if (!vendorUserId.success) {
    throw new AppError('Vendor id is invalid.', 400, 'INVALID_VENDOR_ID');
  }

  const parsed = vendorApprovalSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(
      'Approval details are invalid.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const auth = response.locals.auth as AuthContext;
  const isApproved = parsed.data.status === 'approved';
  const [vendor] = await getDb()
    .update(vendorProfiles)
    .set({
      approvalStatus: parsed.data.status,
      approvedBy: isApproved ? auth.userId : null,
      approvedAt: isApproved ? new Date() : null,
      rejectionReason: isApproved ? null : parsed.data.reason,
      updatedAt: new Date(),
    })
    .where(eq(vendorProfiles.userId, vendorUserId.data))
    .returning({
      userId: vendorProfiles.userId,
      businessName: vendorProfiles.businessName,
      approvalStatus: vendorProfiles.approvalStatus,
      approvedAt: vendorProfiles.approvedAt,
      rejectionReason: vendorProfiles.rejectionReason,
    });

  if (!vendor) {
    throw new AppError('Vendor was not found.', 404, 'VENDOR_NOT_FOUND');
  }

  response.json({ vendor });
});

adminRouter.get('/reviews/pending', async (_request, response) => {
  const records = await getDb()
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      productName: products.name,
      customerFirstName: users.firstName,
      customerLastName: users.lastName,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .innerJoin(users, eq(users.id, reviews.customerId))
    .where(eq(reviews.status, 'pending'))
    .orderBy(asc(reviews.createdAt));
  response.json({ reviews: records });
});

adminRouter.patch('/reviews/:reviewId/moderation', async (request, response) => {
  const reviewId = z.uuid().safeParse(request.params.reviewId);
  if (!reviewId.success) throw new AppError('Review id is invalid.', 400, 'INVALID_REVIEW_ID');
  const parsed = reviewDecisionSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError('Review decision is invalid.', 400, 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  const auth = response.locals.auth as AuthContext;
  const [review] = await getDb()
    .update(reviews)
    .set({ status: parsed.data.status, moderatedBy: auth.userId, moderatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(reviews.id, reviewId.data), eq(reviews.status, 'pending')))
    .returning({ id: reviews.id, status: reviews.status });
  if (!review) throw new AppError('Pending review was not found.', 404, 'REVIEW_NOT_FOUND');
  response.json({ review });
});

adminRouter.get('/complaints', async (_request, response) => {
  const records = await getDb()
    .select({
      id: complaints.id,
      orderReference: checkoutOrders.reference,
      customerFirstName: users.firstName,
      customerLastName: users.lastName,
      customerEmail: users.email,
      subject: complaints.subject,
      description: complaints.description,
      status: complaints.status,
      resolutionNote: complaints.resolutionNote,
      createdAt: complaints.createdAt,
      updatedAt: complaints.updatedAt,
    })
    .from(complaints)
    .innerJoin(checkoutOrders, eq(checkoutOrders.id, complaints.checkoutOrderId))
    .innerJoin(users, eq(users.id, complaints.customerId))
    .orderBy(desc(complaints.createdAt));
  response.json({ complaints: records });
});

adminRouter.patch('/complaints/:complaintId', async (request, response) => {
  const complaintId = z.uuid().safeParse(request.params.complaintId);
  if (!complaintId.success) throw new AppError('Complaint id is invalid.', 400, 'INVALID_COMPLAINT_ID');
  const parsed = complaintDecisionSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError('Complaint decision is invalid.', 400, 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  const [record] = await getDb()
    .select({ customerId: complaints.customerId, status: complaints.status, orderReference: checkoutOrders.reference })
    .from(complaints)
    .innerJoin(checkoutOrders, eq(checkoutOrders.id, complaints.checkoutOrderId))
    .where(eq(complaints.id, complaintId.data))
    .limit(1);
  if (!record) throw new AppError('Complaint was not found.', 404, 'COMPLAINT_NOT_FOUND');
  const allowed = record.status === 'open'
    ? ['in_review', 'resolved', 'dismissed']
    : record.status === 'in_review'
      ? ['resolved', 'dismissed']
      : [];
  if (!allowed.includes(parsed.data.status)) throw new AppError(`A ${record.status} complaint cannot move to ${parsed.data.status}.`, 409, 'INVALID_COMPLAINT_TRANSITION');

  const auth = response.locals.auth as AuthContext;
  const title = parsed.data.status === 'in_review' ? 'Complaint under review' : `Complaint ${parsed.data.status}`;
  const message = `${record.orderReference}: ${parsed.data.resolutionNote || 'Our support team is reviewing your complaint.'}`;
  const rows = await getSqlClient()`
    WITH updated AS (
      UPDATE complaints
      SET status = ${parsed.data.status}, resolution_note = ${parsed.data.resolutionNote ?? null},
        handled_by = ${auth.userId}, updated_at = NOW()
      WHERE id = ${complaintId.data} AND status = ${record.status}
      RETURNING id
    )
    INSERT INTO notifications (id, user_id, type, title, message, link)
    SELECT ${randomUUID()}, ${record.customerId}, 'complaint_update', ${title}, ${message}, '/account/complaints'
    FROM updated
    RETURNING user_id
  `;
  if (!Array.isArray(rows) || rows.length === 0) throw new AppError('This complaint changed before your update. Refresh and try again.', 409, 'COMPLAINT_STATUS_CONFLICT');
  response.json({ complaint: { id: complaintId.data, status: parsed.data.status } });
});

adminRouter.get('/categories', async (_request, response) => {
  const records = await getDb()
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      isActive: categories.isActive,
      productCount: count(products.id),
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
  response.json({ categories: records });
});

adminRouter.post('/categories', async (request, response) => {
  const parsed = categoryInputSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError('Category details are invalid.', 400, 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  try {
    const [category] = await getDb().insert(categories).values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      isActive: parsed.data.isActive,
    }).returning({ id: categories.id });
    response.status(201).json({ category });
  } catch (error) {
    if (isPostgresError(error) && error.code === '23505') throw new AppError('That category URL is already in use.', 409, 'CATEGORY_SLUG_TAKEN');
    throw error;
  }
});

adminRouter.patch('/categories/:categoryId', async (request, response) => {
  const categoryId = z.uuid().safeParse(request.params.categoryId);
  if (!categoryId.success) throw new AppError('Category id is invalid.', 400, 'INVALID_CATEGORY_ID');
  const parsed = categoryUpdateSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError('Category details are invalid.', 400, 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  try {
    const [category] = await getDb().update(categories).set({
      ...parsed.data,
      ...(parsed.data.description === undefined ? {} : { description: parsed.data.description || null }),
      updatedAt: new Date(),
    }).where(eq(categories.id, categoryId.data)).returning({ id: categories.id, isActive: categories.isActive });
    if (!category) throw new AppError('Category was not found.', 404, 'CATEGORY_NOT_FOUND');
    response.json({ category });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isPostgresError(error) && error.code === '23505') throw new AppError('That category URL is already in use.', 409, 'CATEGORY_SLUG_TAKEN');
    throw error;
  }
});

adminRouter.get('/users', async (_request, response) => {
  const records = await getDb()
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      businessName: vendorProfiles.businessName,
      vendorApprovalStatus: vendorProfiles.approvalStatus,
    })
    .from(users)
    .leftJoin(vendorProfiles, eq(vendorProfiles.userId, users.id))
    .orderBy(desc(users.createdAt));
  response.json({ users: records });
});

adminRouter.patch('/users/:userId/status', async (request, response) => {
  const userId = z.uuid().safeParse(request.params.userId);
  if (!userId.success) throw new AppError('User id is invalid.', 400, 'INVALID_USER_ID');
  const parsed = userStatusSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError('Account status is invalid.', 400, 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  const [target] = await getDb().select({ id: users.id, role: users.role, status: users.status }).from(users).where(eq(users.id, userId.data)).limit(1);
  if (!target) throw new AppError('User was not found.', 404, 'USER_NOT_FOUND');
  if (target.role === 'admin') throw new AppError('Administrator accounts cannot be changed here.', 403, 'ADMIN_STATUS_PROTECTED');
  if (target.status === parsed.data.status) {
    response.json({ user: { id: target.id, status: target.status } });
    return;
  }
  const update = getDb().update(users).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(users.id, target.id));
  if (parsed.data.status === 'suspended') {
    await getDb().batch([update, getDb().delete(sessions).where(eq(sessions.userId, target.id))]);
  } else {
    await update;
  }
  response.json({ user: { id: target.id, status: parsed.data.status } });
});

adminRouter.get('/products', async (_request, response) => {
  const records = await getDb()
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      status: products.status,
      priceCents: products.priceCents,
      currency: products.currency,
      imageUrl: products.imageUrl,
      categoryName: categories.name,
      categoryActive: categories.isActive,
      vendorName: vendorProfiles.businessName,
      vendorApprovalStatus: vendorProfiles.approvalStatus,
      availableQuantity: inventory.availableQuantity,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, products.vendorId))
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .orderBy(desc(products.updatedAt));
  response.json({ products: records });
});

adminRouter.patch('/products/:productId/status', async (request, response) => {
  const productId = z.uuid().safeParse(request.params.productId);
  if (!productId.success) throw new AppError('Product id is invalid.', 400, 'INVALID_PRODUCT_ID');
  const parsed = adminProductStatusSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError('Product status is invalid.', 400, 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  const [record] = await getDb()
    .select({ id: products.id, vendorApprovalStatus: vendorProfiles.approvalStatus, categoryActive: categories.isActive })
    .from(products)
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, products.vendorId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.id, productId.data))
    .limit(1);
  if (!record) throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');
  if (parsed.data.status === 'published' && (record.vendorApprovalStatus !== 'approved' || !record.categoryActive)) {
    throw new AppError('Products require an approved vendor and active category before publication.', 409, 'PRODUCT_PUBLICATION_BLOCKED');
  }
  await getDb().update(products).set({
    status: parsed.data.status,
    publishedAt: parsed.data.status === 'published' ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(products.id, record.id));
  response.json({ product: { id: record.id, status: parsed.data.status } });
});
