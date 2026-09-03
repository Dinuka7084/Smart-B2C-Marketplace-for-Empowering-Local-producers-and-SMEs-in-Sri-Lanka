import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  type SQL,
} from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { catalogQuerySchema } from '../catalog/validation.ts';
import { getDb } from '../db/client.ts';
import {
  categories,
  inventory,
  products,
  vendorProfiles,
} from '../db/schema.ts';
import { AppError } from '../errors/app-error.ts';

export const catalogRouter = Router();

catalogRouter.get('/categories', async (_request, response) => {
  const records = await getDb()
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.name));

  response.json({ categories: records });
});

catalogRouter.get('/products', async (request, response) => {
  const parsed = catalogQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new AppError(
      'Catalog filters are invalid.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const query = parsed.data;
  const conditions: SQL[] = [
    eq(products.status, 'published'),
    eq(vendorProfiles.approvalStatus, 'approved'),
    eq(categories.isActive, true),
  ];

  if (query.q) {
    conditions.push(
      or(
        ilike(products.name, `%${query.q}%`),
        ilike(products.description, `%${query.q}%`),
      )!,
    );
  }

  if (query.category) {
    conditions.push(eq(categories.slug, query.category));
  }

  const where = and(...conditions);
  const order =
    query.sort === 'price-asc'
      ? asc(products.priceCents)
      : query.sort === 'price-desc'
        ? desc(products.priceCents)
        : desc(products.publishedAt);
  const offset = (query.page - 1) * query.pageSize;
  const db = getDb();

  const [records, totals] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        priceCents: products.priceCents,
        currency: products.currency,
        imageUrl: products.imageUrl,
        category: {
          name: categories.name,
          slug: categories.slug,
        },
        vendor: {
          businessName: vendorProfiles.businessName,
          storeSlug: vendorProfiles.storeSlug,
        },
        availableQuantity: inventory.availableQuantity,
        publishedAt: products.publishedAt,
      })
      .from(products)
      .innerJoin(vendorProfiles, eq(vendorProfiles.id, products.vendorId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .innerJoin(inventory, eq(inventory.productId, products.id))
      .where(where)
      .orderBy(order)
      .limit(query.pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(products)
      .innerJoin(vendorProfiles, eq(vendorProfiles.id, products.vendorId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(where),
  ]);

  const total = totals[0]?.value ?? 0;
  response.json({
    products: records,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  });
});

catalogRouter.get('/products/:slug', async (request, response) => {
  const slug = z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .safeParse(request.params.slug);

  if (!slug.success) {
    throw new AppError('Product URL is invalid.', 400, 'INVALID_PRODUCT_SLUG');
  }

  const [product] = await getDb()
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      priceCents: products.priceCents,
      currency: products.currency,
      imageUrl: products.imageUrl,
      category: {
        name: categories.name,
        slug: categories.slug,
      },
      vendor: {
        businessName: vendorProfiles.businessName,
        storeSlug: vendorProfiles.storeSlug,
      },
      availableQuantity: inventory.availableQuantity,
      publishedAt: products.publishedAt,
    })
    .from(products)
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, products.vendorId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .where(
      and(
        eq(products.slug, slug.data),
        eq(products.status, 'published'),
        eq(vendorProfiles.approvalStatus, 'approved'),
        eq(categories.isActive, true),
      ),
    )
    .limit(1);

  if (!product) {
    throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');
  }

  response.json({ product });
});
