import { and, eq, gt } from 'drizzle-orm';
import type { RequestHandler } from 'express';

import { env } from '../config/env.ts';
import { getDb } from '../db/client.ts';
import {
  sessions,
  users,
  vendorProfiles,
  type UserRole,
  type VendorApprovalStatus,
} from '../db/schema.ts';
import { AppError } from '../errors/app-error.ts';
import { hashSessionToken, readCookie } from './session.ts';

export type AuthContext = {
  sessionId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  vendorApprovalStatus: VendorApprovalStatus | null;
};

export const requireAuth: RequestHandler = async (request, response, next) => {
  try {
    const token = readCookie(
      request.headers.cookie,
      env.SESSION_COOKIE_NAME,
    );

    if (!token) {
      throw new AppError('Authentication required.', 401, 'AUTH_REQUIRED');
    }

    const [record] = await getDb()
      .select({
        sessionId: sessions.id,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        userStatus: users.status,
        vendorApprovalStatus: vendorProfiles.approvalStatus,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .leftJoin(vendorProfiles, eq(vendorProfiles.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, hashSessionToken(token)),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!record) {
      throw new AppError(
        'Your session is invalid or has expired.',
        401,
        'SESSION_INVALID',
      );
    }

    if (record.userStatus !== 'active') {
      throw new AppError(
        'This account is suspended.',
        403,
        'ACCOUNT_SUSPENDED',
      );
    }

    response.locals.auth = {
      sessionId: record.sessionId,
      userId: record.userId,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      role: record.role,
      vendorApprovalStatus: record.vendorApprovalStatus,
    } satisfies AuthContext;

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: UserRole[]): RequestHandler =>
  (_request, response, next) => {
    const auth = response.locals.auth as AuthContext | undefined;

    if (!auth) {
      next(new AppError('Authentication required.', 401, 'AUTH_REQUIRED'));
      return;
    }

    if (!roles.includes(auth.role)) {
      next(new AppError('You do not have access to this resource.', 403, 'FORBIDDEN'));
      return;
    }

    next();
  };

export const requireApprovedVendor: RequestHandler = (
  _request,
  response,
  next,
) => {
  const auth = response.locals.auth as AuthContext | undefined;

  if (auth?.role !== 'vendor') {
    next(new AppError('Vendor access required.', 403, 'VENDOR_REQUIRED'));
    return;
  }

  if (auth.vendorApprovalStatus !== 'approved') {
    next(
      new AppError(
        'Your vendor account must be approved before using this feature.',
        403,
        'VENDOR_APPROVAL_REQUIRED',
      ),
    );
    return;
  }

  next();
};
