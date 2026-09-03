import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { env } from '../config/env.ts';
import { AppError } from '../errors/app-error.ts';
import * as schema from './schema.ts';

type SqlClient = ReturnType<typeof neon>;

let sqlClient: SqlClient | undefined;

export const getSqlClient = (): SqlClient => {
  if (!env.DATABASE_URL) {
    throw new AppError(
      'Database access is not configured on this server.',
      503,
      'DATABASE_NOT_CONFIGURED',
    );
  }

  sqlClient ??= neon(env.DATABASE_URL);
  return sqlClient;
};

const createDatabase = () => drizzle({ client: getSqlClient(), schema });

type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

export const getDb = (): Database => {
  database ??= createDatabase();
  return database;
};
