import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireRole, type AuthContext } from '../auth/middleware.ts';
import { vendorApprovalSchema } from '../auth/validation.ts';
import { getDb, getSqlClient } from '../db/client.ts';
import { checkoutOrders, complaints, products, reviews, users, vendorProfiles } from '../db/schema.ts';
import { AppError } from '../errors/app-error.ts';
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
