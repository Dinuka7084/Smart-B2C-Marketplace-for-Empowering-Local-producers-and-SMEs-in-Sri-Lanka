import 'dotenv/config';

import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.url().optional(),
);

const optionalSecret = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(32).optional(),
);

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  DATABASE_URL: optionalUrl,
  SESSION_SECRET: optionalSecret,
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  SESSION_COOKIE_NAME: z.string().min(1).default('smart_lanka_session'),
  SEED_ADMIN_EMAIL: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.email().optional(),
  ),
  SEED_ADMIN_PASSWORD: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(12).max(128).optional(),
  ),
  GROQ_API_KEY: optionalString,
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid backend environment configuration', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;

export const serviceReadiness = {
  database: Boolean(env.DATABASE_URL),
  auth: Boolean(env.DATABASE_URL && env.SESSION_SECRET),
  groq: Boolean(env.GROQ_API_KEY),
  cloudinary: Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  ),
} as const;
