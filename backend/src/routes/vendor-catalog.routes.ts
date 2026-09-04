import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
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
import { getDb, getSqlClient } from '../db/client.ts';
import {
  categories,
  inventory,
  inventoryMovements,
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
    const db = getDb();
    const productInsert = db.insert(products).values({
        id: productId,
        vendorId,
        categoryId: input.categoryId,
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        description: input.description,
        priceCents: priceLkrToCents(input.priceLkr),
        status: input.status,
        imageUrl: input.imageUrl ?? null,
        publishedAt: input.status === 'published' ? new Date() : null,
      });
    const inventoryInsert = db.insert(inventory).values({
        productId,
        availableQuantity: input.stock,
        lowStockThreshold: input.lowStockThreshold,
      });
    if (input.stock > 0) {
      await db.batch([
        productInsert,
        inventoryInsert,
        db.insert(inventoryMovements).values({
          productId,
          actorUserId: auth.userId,
          type: 'initial',
          quantityDelta: input.stock,
          quantityBefore: 0,
          quantityAfter: input.stock,
          note: 'Initial product stock',
        }),
      ]);
    } else {
      await db.batch([productInsert, inventoryInsert]);
    }
  } catch (error) {
    handleProductDatabaseError(error);
  }

  response.status(201).json({ product: { id: productId } });
});

const uploadsProductDir = path.resolve(process.cwd(), 'uploads', 'products');
if (!fs.existsSync(uploadsProductDir)) {
  fs.mkdirSync(uploadsProductDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsProductDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = `${Date.now()}-${randomUUID()}${ext}`;
    cb(null, `product-${uniqueSuffix}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only JPG, PNG, and WebP images are allowed.', 400, 'INVALID_FILE_TYPE'));
    }
  },
});

vendorCatalogRouter.post(
  '/products/:productId/image-upload',
  (request, response, next) => {
    upload.single('file')(request, response, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('Product image must be 10 MB or smaller.', 400, 'FILE_TOO_LARGE'));
        }
        return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
      }
      if (err) return next(err);
      next();
    });
  },
  async (request, response) => {
    const productId = productIdFrom(request.params.productId);
    const auth = response.locals.auth as AuthContext;
    const vendorId = await getVendorProfileId(auth);
    await assertOwnedProduct(productId, vendorId);

    if (!request.file) {
      throw new AppError('Choose a JPG, PNG, or WebP image to upload.', 400, 'MISSING_FILE');
    }

    const host = request.get('host') ?? 'localhost:4000';
    const protocol = request.protocol;
    const imageUrl = `${protocol}://${host}/uploads/products/${request.file.filename}`;

    await getDb()
      .update(products)
      .set({
        imageUrl,
        imagePublicId: request.file.filename,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.vendorId, vendorId)));

    response.json({
      product: {
        id: productId,
        imageUrl,
      },
    });
  },
);

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
        'Product image uploads are managed directly on this server. Cloudinary is not required.',
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

    await getDb()
      .update(products)
      .set({
        imageUrl: parsed.data.imageUrl,
        imagePublicId: parsed.data.imagePublicId ?? null,
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

    const rows = await getSqlClient()`
      WITH previous AS MATERIALIZED (
        SELECT i.product_id, i.available_quantity
        FROM inventory i
        INNER JOIN products p ON p.id = i.product_id
        WHERE i.product_id = ${productId} AND p.vendor_id = ${vendorId}
        FOR UPDATE
      ), updated AS (
        UPDATE inventory i
        SET available_quantity = ${parsed.data.availableQuantity},
          low_stock_threshold = COALESCE(${parsed.data.lowStockThreshold ?? null}, i.low_stock_threshold),
          updated_at = NOW()
        FROM previous p
        WHERE i.product_id = p.product_id
        RETURNING i.product_id, i.available_quantity, i.reserved_quantity, i.low_stock_threshold
      ), movement AS (
        INSERT INTO inventory_movements (
          product_id, actor_user_id, type, quantity_delta,
          quantity_before, quantity_after, note
        )
        SELECT u.product_id, ${auth.userId},
          CASE WHEN u.available_quantity > p.available_quantity
            THEN 'restock'::inventory_movement_type
            ELSE 'adjustment'::inventory_movement_type END,
          u.available_quantity - p.available_quantity,
          p.available_quantity, u.available_quantity,
          ${parsed.data.note ?? 'Manual vendor inventory update'}
        FROM updated u
        INNER JOIN previous p ON p.product_id = u.product_id
        WHERE u.available_quantity <> p.available_quantity
        RETURNING id
      )
      SELECT available_quantity, reserved_quantity, low_stock_threshold,
        (SELECT COUNT(*)::int FROM movement) AS movement_count
      FROM updated
    `;
    if (!Array.isArray(rows) || rows.length === 0) throw new AppError('Inventory was not found.', 404, 'INVENTORY_NOT_FOUND');
    const updated = rows[0] as Record<string, number>;
    response.json({
      inventory: {
        availableQuantity: updated.available_quantity,
        reservedQuantity: updated.reserved_quantity,
        lowStockThreshold: updated.low_stock_threshold,
      },
    });
  },
);

vendorCatalogRouter.get('/inventory', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const vendorId = await getVendorProfileId(auth);
  const db = getDb();
  const [records, movements] = await Promise.all([
    db.select({
      productId: products.id,
      name: products.name,
      sku: products.sku,
      status: products.status,
      imageUrl: products.imageUrl,
      availableQuantity: inventory.availableQuantity,
      reservedQuantity: inventory.reservedQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
      updatedAt: inventory.updatedAt,
    }).from(products).innerJoin(inventory, eq(inventory.productId, products.id)).where(eq(products.vendorId, vendorId)).orderBy(desc(inventory.updatedAt)),
    db.select({
      id: inventoryMovements.id,
      productId: inventoryMovements.productId,
      productName: products.name,
      type: inventoryMovements.type,
      quantityDelta: inventoryMovements.quantityDelta,
      quantityBefore: inventoryMovements.quantityBefore,
      quantityAfter: inventoryMovements.quantityAfter,
      note: inventoryMovements.note,
      createdAt: inventoryMovements.createdAt,
    }).from(inventoryMovements).innerJoin(products, eq(products.id, inventoryMovements.productId)).where(eq(products.vendorId, vendorId)).orderBy(desc(inventoryMovements.createdAt)).limit(100),
  ]);
  response.json({ inventory: records, movements });
});

vendorCatalogRouter.get('/metrics', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const vendorId = await getVendorProfileId(auth);
  const rows = await getSqlClient()`
    SELECT
      (SELECT COUNT(*)::int FROM products WHERE vendor_id = ${vendorId} AND status = 'published') AS published_products,
      (SELECT COUNT(*)::int FROM vendor_orders WHERE vendor_id = ${vendorId} AND status IN ('placed', 'processing')) AS orders_to_fulfil,
      (SELECT COUNT(*)::int FROM inventory i INNER JOIN products p ON p.id = i.product_id WHERE p.vendor_id = ${vendorId} AND i.available_quantity <= i.low_stock_threshold) AS low_stock,
      (SELECT COALESCE(SUM(subtotal_cents), 0)::int FROM vendor_orders WHERE vendor_id = ${vendorId} AND status = 'delivered') AS delivered_revenue_cents
  `;
  const metrics = Array.isArray(rows) ? rows[0] as Record<string, number> : {};
  response.json({
    metrics: {
      publishedProducts: metrics.published_products ?? 0,
      ordersToFulfil: metrics.orders_to_fulfil ?? 0,
      lowStock: metrics.low_stock ?? 0,
      deliveredRevenueCents: metrics.delivered_revenue_cents ?? 0,
      currency: 'LKR',
    },
  });
});
