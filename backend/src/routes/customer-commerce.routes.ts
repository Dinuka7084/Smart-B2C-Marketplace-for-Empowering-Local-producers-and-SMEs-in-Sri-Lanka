import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireRole, type AuthContext } from '../auth/middleware.ts';
import { calculateCheckout } from '../checkout/calculations.ts';
import { addressInputSchema, checkoutInputSchema } from '../checkout/validation.ts';
import { getDb, getSqlClient } from '../db/client.ts';
import {
  addresses,
  cartItems,
  carts,
  categories,
  checkoutOrders,
  inventory,
  orderItems,
  orderStatusHistory,
  payments,
  products,
  vendorOrders,
  vendorProfiles,
} from '../db/schema.ts';
import { AppError } from '../errors/app-error.ts';

export const customerCommerceRouter = Router();

customerCommerceRouter.use(requireAuth, requireRole('customer'));

const uuidFrom = (value: string | undefined, label: string): string => {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new AppError(`${label} is invalid.`, 400, 'INVALID_ID');
  return parsed.data;
};

const errorCodeFrom = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('code' in error && typeof error.code === 'string') return error.code;
  if ('cause' in error) return errorCodeFrom(error.cause);
  return undefined;
};

customerCommerceRouter.get('/addresses', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const records = await getDb()
    .select()
    .from(addresses)
    .where(eq(addresses.userId, auth.userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.updatedAt));
  response.json({ addresses: records });
});

customerCommerceRouter.post('/addresses', async (request, response) => {
  const parsed = addressInputSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(
      'Delivery address details are invalid.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const auth = response.locals.auth as AuthContext;
  const db = getDb();
  const addressId = randomUUID();
  const values = { id: addressId, userId: auth.userId, ...parsed.data };

  if (parsed.data.isDefault) {
    await db.batch([
      db
        .update(addresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(addresses.userId, auth.userId)),
      db.insert(addresses).values(values),
    ]);
  } else {
    await db.insert(addresses).values(values);
  }

  response.status(201).json({ address: { ...values } });
});

type CheckoutLine = {
  productId: string;
  vendorId: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  unitPriceCents: number;
  currency: string;
  quantity: number;
  availableQuantity: number;
  productStatus: 'draft' | 'published' | 'archived';
  vendorApprovalStatus: 'pending' | 'approved' | 'rejected';
  categoryActive: boolean;
};

const orderSummary = async (customerId: string, orderId: string) => {
  const db = getDb();
  const [order] = await db
    .select({
      id: checkoutOrders.id,
      reference: checkoutOrders.reference,
      status: checkoutOrders.status,
      recipientName: checkoutOrders.recipientName,
      phone: checkoutOrders.phone,
      addressLine1: checkoutOrders.addressLine1,
      addressLine2: checkoutOrders.addressLine2,
      city: checkoutOrders.city,
      district: checkoutOrders.district,
      postalCode: checkoutOrders.postalCode,
      subtotalCents: checkoutOrders.subtotalCents,
      deliveryFeeCents: checkoutOrders.deliveryFeeCents,
      totalCents: checkoutOrders.totalCents,
      currency: checkoutOrders.currency,
      createdAt: checkoutOrders.createdAt,
    })
    .from(checkoutOrders)
    .where(
      and(
        eq(checkoutOrders.id, orderId),
        eq(checkoutOrders.customerId, customerId),
      ),
    )
    .limit(1);

  if (!order) throw new AppError('Order was not found.', 404, 'ORDER_NOT_FOUND');

  const vendorRecords = await db
    .select({
      id: vendorOrders.id,
      status: vendorOrders.status,
      subtotalCents: vendorOrders.subtotalCents,
      vendorName: vendorProfiles.businessName,
    })
    .from(vendorOrders)
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, vendorOrders.vendorId))
    .where(eq(vendorOrders.checkoutOrderId, orderId))
    .orderBy(asc(vendorProfiles.businessName));

  const itemRecords = await db
    .select({
      id: orderItems.id,
      vendorOrderId: orderItems.vendorOrderId,
      productId: orderItems.productId,
      productName: orderItems.productName,
      imageUrl: orderItems.imageUrl,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
      lineTotalCents: orderItems.lineTotalCents,
    })
    .from(orderItems)
    .innerJoin(vendorOrders, eq(vendorOrders.id, orderItems.vendorOrderId))
    .where(eq(vendorOrders.checkoutOrderId, orderId));

  const historyRecords = await db
    .select({
      id: orderStatusHistory.id,
      vendorOrderId: orderStatusHistory.vendorOrderId,
      previousStatus: orderStatusHistory.previousStatus,
      nextStatus: orderStatusHistory.nextStatus,
      note: orderStatusHistory.note,
      createdAt: orderStatusHistory.createdAt,
    })
    .from(orderStatusHistory)
    .innerJoin(
      vendorOrders,
      eq(vendorOrders.id, orderStatusHistory.vendorOrderId),
    )
    .where(eq(vendorOrders.checkoutOrderId, orderId))
    .orderBy(asc(orderStatusHistory.createdAt));

  return {
    ...order,
    vendors: vendorRecords.map((vendor) => ({
      ...vendor,
      items: itemRecords.filter((item) => item.vendorOrderId === vendor.id),
      history: historyRecords.filter(
        (history) => history.vendorOrderId === vendor.id,
      ),
    })),
  };
};

customerCommerceRouter.post('/checkout', async (request, response) => {
  const parsed = checkoutInputSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(
      'Checkout details are invalid.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const auth = response.locals.auth as AuthContext;
  const db = getDb();
  const [existingOrder] = await db
    .select({ id: checkoutOrders.id })
    .from(checkoutOrders)
    .where(
      and(
        eq(checkoutOrders.customerId, auth.userId),
        eq(checkoutOrders.idempotencyKey, parsed.data.idempotencyKey),
      ),
    )
    .limit(1);
  if (existingOrder) {
    response.json({ order: await orderSummary(auth.userId, existingOrder.id) });
    return;
  }

  const [address] = await db
    .select()
    .from(addresses)
    .where(
      and(
        eq(addresses.id, parsed.data.addressId),
        eq(addresses.userId, auth.userId),
      ),
    )
    .limit(1);
  if (!address) throw new AppError('Delivery address was not found.', 404, 'ADDRESS_NOT_FOUND');

  const [cart] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, auth.userId))
    .limit(1);
  if (!cart) throw new AppError('Your cart is empty.', 409, 'CART_EMPTY');

  const lines: CheckoutLine[] = await db
    .select({
      productId: products.id,
      vendorId: products.vendorId,
      name: products.name,
      sku: products.sku,
      imageUrl: products.imageUrl,
      unitPriceCents: products.priceCents,
      currency: products.currency,
      quantity: cartItems.quantity,
      availableQuantity: inventory.availableQuantity,
      productStatus: products.status,
      vendorApprovalStatus: vendorProfiles.approvalStatus,
      categoryActive: categories.isActive,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, products.vendorId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(cartItems.cartId, cart.id));

  if (lines.length === 0) throw new AppError('Your cart is empty.', 409, 'CART_EMPTY');
  const unavailable = lines.find(
    (line) =>
      line.productStatus !== 'published' ||
      line.vendorApprovalStatus !== 'approved' ||
      !line.categoryActive ||
      line.availableQuantity < line.quantity,
  );
  if (unavailable) {
    throw new AppError(
      `${unavailable.name} is no longer available in the requested quantity.`,
      409,
      'CART_STOCK_CHANGED',
      { productId: unavailable.productId, availableQuantity: unavailable.availableQuantity },
    );
  }

  const totals = calculateCheckout(lines);
  const orderId = randomUUID();
  const reference = `SL-${Date.now().toString(36).toUpperCase()}-${orderId.slice(0, 6).toUpperCase()}`;
  const paymentId = randomUUID();
  const paymentReference = `SIM-${randomUUID()}`;
  const vendorOrderIds = new Map(
    [...totals.vendorSubtotals.keys()].map((vendorId) => [vendorId, randomUUID()]),
  );
  const paidAt = new Date();
  const sql = getSqlClient();

  try {
    await sql.transaction(
      (transaction) => {
        const queries = lines.map((line) => transaction`
          WITH updated AS (
            UPDATE inventory AS i
            SET available_quantity = i.available_quantity - ${line.quantity}, updated_at = NOW()
            FROM products AS p
            INNER JOIN vendor_profiles AS v ON v.id = p.vendor_id
            INNER JOIN categories AS c ON c.id = p.category_id
            WHERE i.product_id = ${line.productId}
              AND p.id = i.product_id
              AND p.status = 'published'
              AND v.approval_status = 'approved'
              AND c.is_active = TRUE
              AND i.available_quantity >= ${line.quantity}
            RETURNING i.product_id
          )
          SELECT 1 / COUNT(*)::int AS stock_guard FROM updated
        `);

        queries.push(transaction`
          INSERT INTO checkout_orders (
            id, reference, idempotency_key, customer_id, address_id, status,
            recipient_name, phone, address_line_1, address_line_2, city, district,
            postal_code, subtotal_cents, delivery_fee_cents, total_cents, currency
          ) VALUES (
            ${orderId}, ${reference}, ${parsed.data.idempotencyKey}, ${auth.userId},
            ${address.id}, 'confirmed', ${address.recipientName}, ${address.phone},
            ${address.line1}, ${address.line2 ?? null}, ${address.city}, ${address.district},
            ${address.postalCode ?? null}, ${totals.subtotalCents},
            ${totals.deliveryFeeCents}, ${totals.totalCents}, 'LKR'
          )
        `);

        for (const [vendorId, subtotalCents] of totals.vendorSubtotals) {
          const vendorOrderId = vendorOrderIds.get(vendorId)!;
          queries.push(transaction`
            INSERT INTO vendor_orders (id, checkout_order_id, vendor_id, status, subtotal_cents)
            VALUES (${vendorOrderId}, ${orderId}, ${vendorId}, 'placed', ${subtotalCents})
          `);
          queries.push(transaction`
            INSERT INTO order_status_history (id, vendor_order_id, actor_user_id, previous_status, next_status, note)
            VALUES (${randomUUID()}, ${vendorOrderId}, ${auth.userId}, NULL, 'placed', 'Order placed through simulated checkout')
          `);
        }

        for (const line of lines) {
          queries.push(transaction`
            INSERT INTO order_items (
              id, vendor_order_id, product_id, product_name, sku, image_url,
              unit_price_cents, quantity, line_total_cents
            ) VALUES (
              ${randomUUID()}, ${vendorOrderIds.get(line.vendorId)!}, ${line.productId},
              ${line.name}, ${line.sku}, ${line.imageUrl}, ${line.unitPriceCents},
              ${line.quantity}, ${line.unitPriceCents * line.quantity}
            )
          `);
        }

        queries.push(transaction`
          INSERT INTO payments (
            id, checkout_order_id, method, status, provider_reference,
            amount_cents, currency, paid_at
          ) VALUES (
            ${paymentId}, ${orderId}, 'simulated', 'paid', ${paymentReference},
            ${totals.totalCents}, 'LKR', ${paidAt}
          )
        `);
        queries.push(transaction`DELETE FROM cart_items WHERE cart_id = ${cart.id}`);
        queries.push(transaction`UPDATE carts SET updated_at = NOW() WHERE id = ${cart.id}`);
        return queries;
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (error) {
    const code = errorCodeFrom(error);
    if (code === '22012' || code === '40001') {
      throw new AppError(
        'Stock changed while the order was being placed. Review your cart and try again.',
        409,
        'CHECKOUT_STOCK_CONFLICT',
      );
    }
    if (code === '23505') {
      const [duplicate] = await db
        .select({ id: checkoutOrders.id })
        .from(checkoutOrders)
        .where(eq(checkoutOrders.idempotencyKey, parsed.data.idempotencyKey))
        .limit(1);
      if (duplicate) {
        response.json({ order: await orderSummary(auth.userId, duplicate.id) });
        return;
      }
    }
    throw error;
  }

  response.status(201).json({ order: await orderSummary(auth.userId, orderId) });
});

customerCommerceRouter.get('/orders', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const records = await getDb()
    .select({
      id: checkoutOrders.id,
      reference: checkoutOrders.reference,
      status: checkoutOrders.status,
      totalCents: checkoutOrders.totalCents,
      currency: checkoutOrders.currency,
      createdAt: checkoutOrders.createdAt,
    })
    .from(checkoutOrders)
    .where(eq(checkoutOrders.customerId, auth.userId))
    .orderBy(desc(checkoutOrders.createdAt));
  response.json({ orders: records });
});

customerCommerceRouter.get('/orders/:orderId', async (request, response) => {
  const auth = response.locals.auth as AuthContext;
  const orderId = uuidFrom(request.params.orderId, 'Order id');
  response.json({ order: await orderSummary(auth.userId, orderId) });
});
