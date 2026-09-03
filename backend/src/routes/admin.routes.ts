import { asc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireRole, type AuthContext } from '../auth/middleware.ts';
import { vendorApprovalSchema } from '../auth/validation.ts';
import { getDb } from '../db/client.ts';
import { users, vendorProfiles } from '../db/schema.ts';
import { AppError } from '../errors/app-error.ts';

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
