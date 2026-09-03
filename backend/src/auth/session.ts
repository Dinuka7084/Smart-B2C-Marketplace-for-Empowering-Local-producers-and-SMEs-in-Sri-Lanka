import { createHmac, randomBytes } from 'node:crypto';

import { eq } from 'drizzle-orm';
import type { Response } from 'express';

import { env } from '../config/env.ts';
import { getDb } from '../db/client.ts';
import { sessions } from '../db/schema.ts';
import { AppError } from '../errors/app-error.ts';

const sessionSecret = (): string => {
  if (!env.SESSION_SECRET) {
    throw new AppError(
      'Authentication is not configured on this server.',
      503,
      'AUTH_NOT_CONFIGURED',
    );
  }

  return env.SESSION_SECRET;
};

export const hashSessionToken = (token: string): string =>
  createHmac('sha256', sessionSecret()).update(token).digest('hex');

export const createSession = async (
  userId: string,
): Promise<{ token: string; expiresAt: Date }> => {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1_000,
  );

  await getDb().insert(sessions).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });

  return { token, expiresAt };
};

export const deleteSession = async (token: string): Promise<void> => {
  await getDb()
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashSessionToken(token)));
};

export const setSessionCookie = (
  response: Response,
  token: string,
  expiresAt: Date,
): void => {
  response.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
};

export const clearSessionCookie = (response: Response): void => {
  response.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};

export const readCookie = (
  cookieHeader: string | undefined,
  cookieName: string,
): string | undefined => {
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;

    const name = cookie.slice(0, separator).trim();
    if (name !== cookieName) continue;

    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
};
