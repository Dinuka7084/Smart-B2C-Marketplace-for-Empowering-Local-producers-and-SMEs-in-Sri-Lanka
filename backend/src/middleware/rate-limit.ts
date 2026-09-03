import type { RequestHandler } from 'express';

type AttemptWindow = {
  count: number;
  resetsAt: number;
};

export const createRateLimiter = ({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}): RequestHandler => {
  const attempts = new Map<string, AttemptWindow>();

  return (request, response, next) => {
    const now = Date.now();
    const key = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const current = attempts.get(key);
    const window =
      !current || current.resetsAt <= now
        ? { count: 0, resetsAt: now + windowMs }
        : current;

    window.count += 1;
    attempts.set(key, window);

    response.setHeader('RateLimit-Limit', String(limit));
    response.setHeader(
      'RateLimit-Remaining',
      String(Math.max(0, limit - window.count)),
    );
    response.setHeader(
      'RateLimit-Reset',
      String(Math.ceil(window.resetsAt / 1_000)),
    );

    if (window.count > limit) {
      response.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please try again later.',
        },
      });
      return;
    }

    if (attempts.size > 1_000) {
      for (const [attemptKey, attempt] of attempts) {
        if (attempt.resetsAt <= now) attempts.delete(attemptKey);
      }
    }

    next();
  };
};
