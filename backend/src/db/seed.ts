import { eq } from 'drizzle-orm';

import { hashPassword } from '../auth/password.ts';
import { env } from '../config/env.ts';
import { getDb } from './client.ts';
import { users } from './schema.ts';

if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
  throw new Error(
    'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in backend/.env.',
  );
}

const email = env.SEED_ADMIN_EMAIL.toLowerCase();
const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);

const [existingAdmin] = await getDb()
  .select({ id: users.id })
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

if (existingAdmin) {
  await getDb()
    .update(users)
    .set({
      role: 'admin',
      status: 'active',
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existingAdmin.id));

  console.log(`Updated Smart Lanka admin: ${email}`);
} else {
  await getDb().insert(users).values({
    email,
    passwordHash,
    role: 'admin',
    firstName: 'Smart Lanka',
    lastName: 'Administrator',
  });

  console.log(`Created Smart Lanka admin: ${email}`);
}
