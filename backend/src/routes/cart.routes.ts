import { and, asc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireRole, type AuthContext } from '../auth/middleware.ts';
import { addCartItemSchema, updateCartItemSchema } from '../cart/validation.ts';
import { calculateCartTotals } from '../cart/totals.ts';
import { getDb } from '../db/client.ts';
import {
  cartItems,
  carts,
  categories,
  inventory,
  products,
  vendorProfiles,
} from '../db/schema.ts';
import { AppError } from '../errors/app-error.ts';

export const cartRouter = Router();

cartRouter.use(requireAuth, requireRole('customer'));

const productIdFrom = (value: string | undefined): string => {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) {
    throw new AppError('Product id is invalid.', 400, 'INVALID_PRODUCT_ID');
  }
  return parsed.data;
};

const getOrCreateCart = async (userId: string) => {
  const db = getDb();
  await db
    .insert(carts)
    .values({ userId })
    .onConflictDoNothing({ target: carts.userId });

  const [cart] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (!cart) {
    throw new AppError('Cart could not be created.', 500, 'CART_NOT_AVAILABLE');
  }
  return cart;
};

const assertPurchasableStock = async (productId: string, quantity: number) => {
  const [product] = await getDb()
    .select({ availableQuantity: inventory.availableQuantity })
    .from(products)
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, products.vendorId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.id, productId),
        eq(products.status, 'published'),
        eq(vendorProfiles.approvalStatus, 'approved'),
        eq(categories.isActive, true),
      ),
    )
    .limit(1);

  if (!product) {
    throw new AppError(
      'This product is not currently available for purchase.',
      409,
      'PRODUCT_UNAVAILABLE',
    );
  }
  if (product.availableQuantity < quantity) {
    throw new AppError(
      `Only ${product.availableQuantity} unit${product.availableQuantity === 1 ? '' : 's'} are currently available.`,
      409,
      'INSUFFICIENT_STOCK',
      { availableQuantity: product.availableQuantity },
    );
  }
};

const cartResponse = async (cartId: string) => {
  const records = await getDb()
    .select({
      productId: products.id,
      slug: products.slug,
      name: products.name,
      imageUrl: products.imageUrl,
      unitPriceCents: products.priceCents,
      currency: products.currency,
      quantity: cartItems.quantity,
      availableQuantity: inventory.availableQuantity,
      productStatus: products.status,
      vendorApprovalStatus: vendorProfiles.approvalStatus,
      categoryActive: categories.isActive,
      vendorName: vendorProfiles.businessName,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, products.vendorId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt));

  const items = records.map((record) => ({
    productId: record.productId,
    slug: record.slug,
    name: record.name,
    imageUrl: record.imageUrl,
    unitPriceCents: record.unitPriceCents,
    currency: record.currency,
    quantity: record.quantity,
    availableQuantity: record.availableQuantity,
    vendorName: record.vendorName,
    isAvailable:
      record.productStatus === 'published' &&
      record.vendorApprovalStatus === 'approved' &&
      record.categoryActive &&
      record.availableQuantity >= record.quantity,
    lineTotalCents: record.unitPriceCents * record.quantity,
  }));
  const totals = calculateCartTotals(items);

  return {
    cart: {
      id: cartId,
      items,
      itemCount: totals.itemCount,
      subtotalCents: totals.subtotalCents,
      currency: items[0]?.currency ?? 'LKR',
      canCheckout: totals.canCheckout,
    },
  };
};

cartRouter.get('/', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const cart = await getOrCreateCart(auth.userId);
  response.json(await cartResponse(cart.id));
});

cartRouter.post('/items', async (request, response) => {
  const parsed = addCartItemSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(
      'Cart item details are invalid.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const auth = response.locals.auth as AuthContext;
  const cart = await getOrCreateCart(auth.userId);
  const [existing] = await getDb()
    .select({ quantity: cartItems.quantity })
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.productId, parsed.data.productId),
      ),
    )
    .limit(1);
  const quantity = (existing?.quantity ?? 0) + parsed.data.quantity;

  if (quantity > 100) {
    throw new AppError(
      'A cart item cannot exceed 100 units.',
      400,
      'CART_QUANTITY_LIMIT',
    );
  }
  await assertPurchasableStock(parsed.data.productId, quantity);

  const db = getDb();
  await db
    .insert(cartItems)
    .values({
      cartId: cart.id,
      productId: parsed.data.productId,
      quantity,
    })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.productId],
      set: { quantity, updatedAt: new Date() },
    });
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));

  response.status(201).json(await cartResponse(cart.id));
});

cartRouter.patch('/items/:productId', async (request, response) => {
  const productId = productIdFrom(request.params.productId);
  const parsed = updateCartItemSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(
      'Cart quantity is invalid.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const auth = response.locals.auth as AuthContext;
  const cart = await getOrCreateCart(auth.userId);
  await assertPurchasableStock(productId, parsed.data.quantity);

  const [updated] = await getDb()
    .update(cartItems)
    .set({ quantity: parsed.data.quantity, updatedAt: new Date() })
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))
    .returning({ productId: cartItems.productId });

  if (!updated) {
    throw new AppError('Cart item was not found.', 404, 'CART_ITEM_NOT_FOUND');
  }
  await getDb().update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  response.json(await cartResponse(cart.id));
});

cartRouter.delete('/items/:productId', async (request, response) => {
  const productId = productIdFrom(request.params.productId);
  const auth = response.locals.auth as AuthContext;
  const cart = await getOrCreateCart(auth.userId);

  const [deleted] = await getDb()
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))
    .returning({ productId: cartItems.productId });

  if (!deleted) {
    throw new AppError('Cart item was not found.', 404, 'CART_ITEM_NOT_FOUND');
  }
  await getDb().update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  response.json(await cartResponse(cart.id));
});
