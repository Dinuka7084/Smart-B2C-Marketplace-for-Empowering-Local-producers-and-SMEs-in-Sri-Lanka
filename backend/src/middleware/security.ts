import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

import { readCookie } from '../auth/session.ts';
import { env } from '../config/env.ts';
import { AppError } from '../errors/app-error.ts';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export const isTrustedBrowserWrite = ({
  method,
  origin,
  fetchSite,
  hasSession,
  frontendOrigin,
}: {
  method: string;
  origin?: string | undefined;
  fetchSite?: string | undefined;
  hasSession: boolean;
  frontendOrigin: string;
}): boolean => {
  if (safeMethods.has(method.toUpperCase())) return true;
  if (fetchSite === 'cross-site') return false;
  if (origin) return origin === frontendOrigin;
  return !hasSession;
};

export const applyApiSecurity: RequestHandler = (request, response, next) => {
  const requestId = randomUUID();
  response.locals.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (env.NODE_ENV === 'production') {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const hasSession = Boolean(readCookie(request.headers.cookie, env.SESSION_COOKIE_NAME));
  if (hasSession || request.path.startsWith('/api/v1/auth')) {
    response.setHeader('Cache-Control', 'private, no-store');
  }

  if (!isTrustedBrowserWrite({
    method: request.method,
    origin: request.headers.origin,
    fetchSite: request.headers['sec-fetch-site'],
    hasSession,
    frontendOrigin: env.FRONTEND_URL,
  })) {
    next(new AppError('The request origin is not allowed.', 403, 'UNTRUSTED_ORIGIN'));
    return;
  }

  next();
};
