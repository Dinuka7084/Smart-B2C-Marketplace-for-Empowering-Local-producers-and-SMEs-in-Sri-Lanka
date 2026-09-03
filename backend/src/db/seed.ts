import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { hashPassword } from '../auth/password.ts';
import { env } from '../config/env.ts';
import { getDb } from './client.ts';
import { categories, users } from './schema.ts';

const defaultCategories = [
  {
    name: 'Spice & pantry',
    slug: 'spice-pantry',
    description: 'Spices, preserves, tea, coffee and locally prepared pantry goods.',
  },
  {
    name: 'Home & craft',
    slug: 'home-craft',
    description: 'Handmade homeware, pottery, basketry and decorative craft.',
  },
  {
    name: 'Handloom & wear',
    slug: 'handloom-wear',
    description: 'Small-batch clothing, accessories and Sri Lankan textiles.',
  },
  {
    name: 'Wellness',
    slug: 'wellness',
    description: 'Natural personal care and thoughtfully made wellness products.',
  },
];

for (const category of defaultCategories) {
  await getDb()
    .insert(categories)
    .values(category)
    .onConflictDoUpdate({
      target: categories.slug,
      set: {
        name: category.name,
        description: category.description,
        isActive: true,
        updatedAt: new Date(),
      },
    });
}

console.log(`Seeded ${defaultCategories.length} Smart Lanka categories.`);

const seedCredentials = z
  .object({
    email: z.email(),
    password: z.string().min(12).max(128),
  })
  .safeParse({
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
  });

if (!seedCredentials.success) {
  console.warn(
    'Skipped administrator seed: set a valid SEED_ADMIN_EMAIL and a 12-128 character SEED_ADMIN_PASSWORD in backend/.env.',
  );
} else {
  const email = seedCredentials.data.email.toLowerCase();
  const passwordHash = await hashPassword(seedCredentials.data.password);
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
}
