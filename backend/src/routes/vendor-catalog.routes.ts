import { randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import {
  inventoryUpdateSchema,
  priceLkrToCents,
  productImageSchema,
  productInputSchema,
  productUpdateSchema,
} from '../catalog/validation.ts';
import { createCloudinarySignature } from '../cloudinary/signature.ts';
import { env } from '../config/env.ts';
import {
  requireApprovedVendor,
  requireAuth,
  requireRole,
  type AuthContext,
} from '../auth/middleware.ts';
import { getDb } from '../db/client.ts';
import {
  categories,
  inventory,
  products,
  vendorProfiles,
} from '../db/schema.ts';
import { AppError, isPostgresError } from '../errors/app-error.ts';

export const vendorCatalogRouter = Router();

vendorCatalogRouter.use(
  requireAuth,
  requireRole('vendor'),
  requireApprovedVendor,
);

const getVendorProfileId = async (auth: AuthContext): Promise<string> => {
  const [vendor] = await getDb()
    .select({ id: vendorProfiles.id })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, auth.userId))
    .limit(1);

  if (!vendor) {
    throw new AppError('Vendor profile was not found.', 404, 'VENDOR_NOT_FOUND');
  }

  return vendor.id;
};

const assertActiveCategory = async (categoryId: string): Promise<void> => {
  const [category] = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.isActive, true)))
    .limit(1);

  if (!category) {
    throw new AppError(
      'Choose an active product category.',
      400,
      'CATEGORY_INVALID',
    );
  }
};

const handleProductDatabaseError = (error: unknown): never => {
  if (isPostgresError(error) && error.code === '23505') {
    const isSku = error.constraint?.includes('vendor_sku');
    throw new AppError(
      isSku
        ? 'You already use that SKU for another product.'
        : 'That product URL is already in use.',
      409,
      isSku ? 'SKU_TAKEN' : 'PRODUCT_SLUG_TAKEN',
    );
  }

  throw error;
};

const productIdFrom = (value: string | undefined): string => {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) {
    throw new AppError('Product id is invalid.', 400, 'INVALID_PRODUCT_ID');
  }
  return parsed.data;
};

const assertOwnedProduct = async (
  productId: string,
  vendorId: string,
): Promise<void> => {
  const [ownedProduct] = await getDb()
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.vendorId, vendorId)))
    .limit(1);

  if (!ownedProduct) {
    throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');
  }
};

vendorCatalogRouter.get('/products', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const vendorId = await getVendorProfileId(auth);

  const records = await getDb()
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      description: products.description,
      priceCents: products.priceCents,
      currency: products.currency,
      status: products.status,
      imageUrl: products.imageUrl,
      categoryId: categories.id,
      categoryName: categories.name,
      availableQuantity: inventory.availableQuantity,
      reservedQuantity: inventory.reservedQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .where(eq(products.vendorId, vendorId))
    .orderBy(desc(products.updatedAt));

  response.json({ products: records });
});

vendorCatalogRouter.post('/products', async (request, response) => {
  const parsed = productInputSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(
      'Product details are invalid.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const input = parsed.data;
  await assertActiveCategory(input.categoryId);

  const auth = response.locals.auth as AuthContext;
  const vendorId = await getVendorProfileId(auth);
  const productId = randomUUID();

  try {
    await getDb().batch([
      getDb().insert(products).values({
        id: productId,
        vendorId,
        categoryId: input.categoryId,
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        description: input.description,
        priceCents: priceLkrToCents(input.priceLkr),
        status: input.status,
        publishedAt: input.status === 'published' ? new Date() : null,
      }),
      getDb().insert(inventory).values({
        productId,
        availableQuantity: input.stock,
        lowStockThreshold: input.lowStockThreshold,
      }),
    ]);
  } catch (error) {
    handleProductDatabaseError(error);
  }

  response.status(201).json({ product: { id: productId } });
});

vendorCatalogRouter.post(
  '/products/:productId/image-upload-signature',
  async (request, response) => {
    const productId = productIdFrom(request.params.productId);
    const auth = response.locals.auth as AuthContext;
    const vendorId = await getVendorProfileId(auth);
    await assertOwnedProduct(productId, vendorId);

    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new AppError(
        'Product image uploads are not configured yet.',
        503,
        'CLOUDINARY_NOT_CONFIGURED',
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `smart-lanka/products/${vendorId}`;
    const publicId = randomUUID();
    const signature = createCloudinarySignature(
      { folder, public_id: publicId, timestamp },
      CLOUDINARY_API_SECRET,
    );

    response.json({
      upload: {
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        timestamp,
        folder,
        publicId,
        signature,
      },
    });
  },
);

vendorCatalogRouter.patch(
  '/products/:productId/image',
  async (request, response) => {
    const productId = productIdFrom(request.params.productId);
    const parsed = productImageSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError(
        'Product image details are invalid.',
        400,
        'VALIDATION_ERROR',
        parsed.error.flatten().fieldErrors,
      );
    }

    const auth = response.locals.auth as AuthContext;
    const vendorId = await getVendorProfileId(auth);
    await assertOwnedProduct(productId, vendorId);

    const expectedPublicIdPrefix = `smart-lanka/products/${vendorId}/`;
    const expectedUrlPrefix = env.CLOUDINARY_CLOUD_NAME
      ? `/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`
      : null;
    const imageUrl = new URL(parsed.data.imageUrl);
    if (
      !parsed.data.imagePublicId.startsWith(expectedPublicIdPrefix) ||
      !expectedUrlPrefix ||
      !imageUrl.pathname.startsWith(expectedUrlPrefix)
    ) {
      throw new AppError(
        'The uploaded image does not belong to this vendor.',
        400,
        'INVALID_PRODUCT_IMAGE',
      );
    }

    await getDb()
      .update(products)
      .set({
        imageUrl: parsed.data.imageUrl,
        imagePublicId: parsed.data.imagePublicId,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.vendorId, vendorId)));

    response.json({
      product: {
        id: productId,
        imageUrl: parsed.data.imageUrl,
      },
    });
  },
);

vendorCatalogRouter.patch('/products/:productId', async (request, response) => {
  const productId = productIdFrom(request.params.productId);
  const parsed = productUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(
      'Product details are invalid.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const input = parsed.data;
  if (input.categoryId) await assertActiveCategory(input.categoryId);
  const { priceLkr, ...productFields } = input;

  const auth = response.locals.auth as AuthContext;
  const vendorId = await getVendorProfileId(auth);

  try {
    const [updated] = await getDb()
      .update(products)
      .set({
        ...productFields,
        ...(priceLkr === undefined
          ? {}
          : { priceCents: priceLkrToCents(priceLkr) }),
        ...(input.status === undefined
          ? {}
          : {
              publishedAt: input.status === 'published' ? new Date() : null,
            }),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.vendorId, vendorId)))
      .returning({ id: products.id });

    if (!updated) {
      throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    handleProductDatabaseError(error);
  }

  response.json({ product: { id: productId } });
});

vendorCatalogRouter.patch(
  '/products/:productId/inventory',
  async (request, response) => {
    const productId = productIdFrom(request.params.productId);
    const parsed = inventoryUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError(
        'Inventory details are invalid.',
        400,
        'VALIDATION_ERROR',
        parsed.error.flatten().fieldErrors,
      );
    }

    const auth = response.locals.auth as AuthContext;
    const vendorId = await getVendorProfileId(auth);
    await assertOwnedProduct(productId, vendorId);

    const [updated] = await getDb()
      .update(inventory)
      .set({
        availableQuantity: parsed.data.availableQuantity,
        ...(parsed.data.lowStockThreshold === undefined
          ? {}
          : { lowStockThreshold: parsed.data.lowStockThreshold }),
        updatedAt: new Date(),
      })
      .where(eq(inventory.productId, productId))
      .returning({
        availableQuantity: inventory.availableQuantity,
        reservedQuantity: inventory.reservedQuantity,
        lowStockThreshold: inventory.lowStockThreshold,
      });

    response.json({ inventory: updated });
  },
);
