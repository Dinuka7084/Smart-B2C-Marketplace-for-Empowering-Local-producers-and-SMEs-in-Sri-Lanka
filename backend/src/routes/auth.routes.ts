import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Router } from 'express';

import { env } from '../config/env.ts';
import { getDb } from '../db/client.ts';
import { users, vendorProfiles } from '../db/schema.ts';
import { AppError, isPostgresError } from '../errors/app-error.ts';
import { createRateLimiter } from '../middleware/rate-limit.ts';
import { requireAuth, type AuthContext } from '../auth/middleware.ts';
import { hashPassword, verifyPassword } from '../auth/password.ts';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  readCookie,
  setSessionCookie,
} from '../auth/session.ts';
import { loginSchema, registerSchema } from '../auth/validation.ts';

export const authRouter = Router();

const authRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1_000,
});

let dummyPasswordHash: Promise<string> | undefined;

const verifyAgainstDummyHash = async (password: string): Promise<void> => {
  dummyPasswordHash ??= hashPassword('not-a-real-smart-lanka-password');
  await verifyPassword(password, await dummyPasswordHash);
};

authRouter.post('/register', authRateLimiter, async (request, response) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(
      'Registration details are invalid.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const input = parsed.data;
  const db = getDb();
  const passwordHash = await hashPassword(input.password);
  const userId = randomUUID();

  try {
    if (input.role === 'vendor') {
      await db.batch([
        db.insert(users).values({
          id: userId,
          email: input.email,
          passwordHash,
          role: 'vendor',
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
        }),
        db.insert(vendorProfiles).values({
          id: randomUUID(),
          userId,
          businessName: input.businessName!,
          storeSlug: input.storeSlug!,
          registrationNumber: input.registrationNumber,
          description: input.description,
        }),
      ]);
    } else {
      await db.insert(users).values({
        id: userId,
        email: input.email,
        passwordHash,
        role: 'customer',
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      });
    }
  } catch (error) {
    if (isPostgresError(error) && error.code === '23505') {
      const isStoreSlug = error.constraint?.includes('store_slug');
      throw new AppError(
        isStoreSlug
          ? 'That store URL is already in use.'
          : 'An account with that email already exists.',
        409,
        isStoreSlug ? 'STORE_SLUG_TAKEN' : 'EMAIL_TAKEN',
      );
    }

    throw error;
  }

  const session = await createSession(userId);
  setSessionCookie(response, session.token, session.expiresAt);

  response.status(201).json({
    user: {
      id: userId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      vendorApprovalStatus: input.role === 'vendor' ? 'pending' : null,
    },
  });
});

authRouter.post('/login', authRateLimiter, async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(
      'Email and password are required.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const [record] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      status: users.status,
      vendorApprovalStatus: vendorProfiles.approvalStatus,
    })
    .from(users)
    .leftJoin(vendorProfiles, eq(vendorProfiles.userId, users.id))
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (!record) {
    await verifyAgainstDummyHash(parsed.data.password);
    throw new AppError(
      'Invalid email or password.',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  const passwordMatches = await verifyPassword(
    parsed.data.password,
    record.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(
      'Invalid email or password.',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  if (record.status !== 'active') {
    throw new AppError(
      'This account is suspended.',
      403,
      'ACCOUNT_SUSPENDED',
    );
  }

  const session = await createSession(record.id);
  setSessionCookie(response, session.token, session.expiresAt);

  response.json({
    user: {
      id: record.id,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      role: record.role,
      vendorApprovalStatus: record.vendorApprovalStatus,
    },
  });
});

authRouter.post('/logout', async (request, response) => {
  const token = readCookie(request.headers.cookie, env.SESSION_COOKIE_NAME);

  if (token && env.DATABASE_URL && env.SESSION_SECRET) {
    await deleteSession(token);
  }

  clearSessionCookie(response);
  response.status(204).send();
});

authRouter.get('/me', requireAuth, (_request, response) => {
  const auth = response.locals.auth as AuthContext;

  response.json({
    user: {
      id: auth.userId,
      email: auth.email,
      firstName: auth.firstName,
      lastName: auth.lastName,
      role: auth.role,
      vendorApprovalStatus: auth.vendorApprovalStatus,
    },
  });
});
