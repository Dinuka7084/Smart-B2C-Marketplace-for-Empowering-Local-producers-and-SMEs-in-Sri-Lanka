import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { env } from '../config/env.ts';
import { AppError } from '../errors/app-error.ts';
import * as schema from './schema.ts';

const createDatabase = (databaseUrl: string) => {
  const sql = neon(databaseUrl);
  return drizzle({ client: sql, schema });
};

type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

export const getDb = (): Database => {
  if (!env.DATABASE_URL) {
    throw new AppError(
      'Database access is not configured on this server.',
      503,
      'DATABASE_NOT_CONFIGURED',
    );
  }

  database ??= createDatabase(env.DATABASE_URL);
  return database;
};
