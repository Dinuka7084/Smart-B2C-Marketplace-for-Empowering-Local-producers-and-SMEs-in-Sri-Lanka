import { randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import {
  requireApprovedVendor,
  requireAuth,
  requireRole,
  type AuthContext,
} from '../auth/middleware.ts';
import {
  allowedOrderTransitions,
  canTransitionOrder,
  vendorOrderStatusSchema,
  type FulfilmentStatus,
} from '../checkout/order-status.ts';
import { getDb, getSqlClient } from '../db/client.ts';
import {
  checkoutOrders,
  orderItems,
  vendorOrders,
  vendorProfiles,
} from '../db/schema.ts';
import { AppError } from '../errors/app-error.ts';

export const vendorOrdersRouter = Router();

vendorOrdersRouter.use(requireAuth, requireRole('vendor'), requireApprovedVendor);

const getVendorId = async (userId: string): Promise<string> => {
  const [vendor] = await getDb()
    .select({ id: vendorProfiles.id })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, userId))
    .limit(1);
  if (!vendor) throw new AppError('Vendor profile was not found.', 404, 'VENDOR_NOT_FOUND');
  return vendor.id;
};

const orderIdFrom = (value: string | undefined): string => {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new AppError('Order id is invalid.', 400, 'INVALID_ORDER_ID');
  return parsed.data;
};

const listVendorOrders = async (vendorId: string) => {
  const db = getDb();
  const orders = await db
    .select({
      id: vendorOrders.id,
      reference: checkoutOrders.reference,
      status: vendorOrders.status,
      subtotalCents: vendorOrders.subtotalCents,
      currency: checkoutOrders.currency,
      recipientName: checkoutOrders.recipientName,
      phone: checkoutOrders.phone,
      addressLine1: checkoutOrders.addressLine1,
      addressLine2: checkoutOrders.addressLine2,
      city: checkoutOrders.city,
      district: checkoutOrders.district,
      postalCode: checkoutOrders.postalCode,
      createdAt: vendorOrders.createdAt,
      updatedAt: vendorOrders.updatedAt,
    })
    .from(vendorOrders)
    .innerJoin(checkoutOrders, eq(checkoutOrders.id, vendorOrders.checkoutOrderId))
    .where(eq(vendorOrders.vendorId, vendorId))
    .orderBy(desc(vendorOrders.createdAt));

  const items = await db
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
    .where(eq(vendorOrders.vendorId, vendorId));

  return orders.map((order) => ({
    ...order,
    allowedNextStatuses: allowedOrderTransitions[order.status],
    items: items.filter((item) => item.vendorOrderId === order.id),
  }));
};

vendorOrdersRouter.get('/orders', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const vendorId = await getVendorId(auth.userId);
  response.json({ orders: await listVendorOrders(vendorId) });
});

vendorOrdersRouter.patch('/orders/:orderId/status', async (request, response) => {
  const orderId = orderIdFrom(request.params.orderId);
  const parsed = vendorOrderStatusSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(
      'Order status details are invalid.',
      400,
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  const auth = response.locals.auth as AuthContext;
  const vendorId = await getVendorId(auth.userId);
  const [order] = await getDb()
    .select({
      status: vendorOrders.status,
      customerId: checkoutOrders.customerId,
      reference: checkoutOrders.reference,
      checkoutOrderId: checkoutOrders.id,
    })
    .from(vendorOrders)
    .innerJoin(checkoutOrders, eq(checkoutOrders.id, vendorOrders.checkoutOrderId))
    .where(and(eq(vendorOrders.id, orderId), eq(vendorOrders.vendorId, vendorId)))
    .limit(1);

  if (!order) throw new AppError('Order was not found.', 404, 'ORDER_NOT_FOUND');
  if (!canTransitionOrder(order.status, parsed.data.nextStatus)) {
    throw new AppError(
      `An order cannot move from ${order.status} to ${parsed.data.nextStatus}.`,
      409,
      'INVALID_ORDER_TRANSITION',
    );
  }

  const notificationTitle = parsed.data.nextStatus === 'cancelled'
    ? 'Order fulfilment cancelled'
    : `Order ${parsed.data.nextStatus}`;
  const notificationMessage = parsed.data.nextStatus === 'cancelled'
    ? `${order.reference} was cancelled by the vendor. Open tracking for details.`
    : `${order.reference} is now ${parsed.data.nextStatus}.`;

  const rows = await getSqlClient()`
    WITH updated AS (
      UPDATE vendor_orders
      SET status = ${parsed.data.nextStatus}, updated_at = NOW()
      WHERE id = ${orderId}
        AND vendor_id = ${vendorId}
        AND status = ${order.status}
      RETURNING id
    ), history AS (
      INSERT INTO order_status_history (
        id, vendor_order_id, actor_user_id, previous_status, next_status, note
      )
      SELECT ${randomUUID()}, id, ${auth.userId}, ${order.status},
        ${parsed.data.nextStatus}, ${parsed.data.note ?? null}
      FROM updated
      RETURNING vendor_order_id
    )
    INSERT INTO notifications (id, user_id, type, title, message, link)
    SELECT ${randomUUID()}, ${order.customerId}, 'order_status',
      ${notificationTitle}, ${notificationMessage},
      ${`/account/orders/${order.checkoutOrderId}`}
    FROM history
    RETURNING user_id
  `;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError(
      'This order changed before your update. Refresh and try again.',
      409,
      'ORDER_STATUS_CONFLICT',
    );
  }

  response.json({
    order: {
      id: orderId,
      status: parsed.data.nextStatus,
      allowedNextStatuses:
        allowedOrderTransitions[parsed.data.nextStatus as FulfilmentStatus],
    },
  });
});
