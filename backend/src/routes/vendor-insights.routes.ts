import { eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireApprovedVendor, requireAuth, requireRole, type AuthContext } from '../auth/middleware.ts';
import { productDescriptionDraftSchema } from '../catalog/validation.ts';
import { getDb, getSqlClient } from '../db/client.ts';
import { vendorProfiles } from '../db/schema.ts';
import { AppError } from '../errors/app-error.ts';
import { generateProductDescription } from '../groq/client.ts';

export const vendorInsightsRouter = Router();

vendorInsightsRouter.use(requireAuth, requireRole('vendor'), requireApprovedVendor);

const vendorIdFor = async (auth: AuthContext): Promise<string> => {
  const [vendor] = await getDb().select({ id: vendorProfiles.id }).from(vendorProfiles).where(eq(vendorProfiles.userId, auth.userId)).limit(1);
  if (!vendor) throw new AppError('Vendor profile was not found.', 404, 'VENDOR_NOT_FOUND');
  return vendor.id;
};

vendorInsightsRouter.get('/analytics', async (_request, response) => {
  const auth = response.locals.auth as AuthContext;
  const vendorId = await vendorIdFor(auth);
  const sql = getSqlClient();
  const [summaryRows, dailyRows, statusRows, productRows] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS delivered_orders,
        COALESCE(SUM(vo.subtotal_cents), 0)::int AS revenue_cents,
        COALESCE(ROUND(AVG(vo.subtotal_cents)), 0)::int AS average_order_cents,
        COALESCE((SELECT SUM(oi.quantity)::int FROM order_items oi INNER JOIN vendor_orders sold ON sold.id = oi.vendor_order_id WHERE sold.vendor_id = ${vendorId} AND sold.status = 'delivered' AND sold.created_at >= CURRENT_DATE - INTERVAL '29 days'), 0)::int AS units_sold
      FROM vendor_orders vo
      WHERE vo.vendor_id = ${vendorId} AND vo.status = 'delivered'
        AND vo.created_at >= CURRENT_DATE - INTERVAL '29 days'
    `,
    sql`
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
      ), sales AS (
        SELECT created_at::date AS day, COUNT(*)::int AS orders, SUM(subtotal_cents)::int AS revenue_cents
        FROM vendor_orders
        WHERE vendor_id = ${vendorId} AND status = 'delivered'
          AND created_at >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY created_at::date
      )
      SELECT TO_CHAR(days.day, 'YYYY-MM-DD') AS date,
        COALESCE(sales.orders, 0)::int AS orders,
        COALESCE(sales.revenue_cents, 0)::int AS revenue_cents
      FROM days LEFT JOIN sales USING (day) ORDER BY days.day
    `,
    sql`
      SELECT status, COUNT(*)::int AS count
      FROM vendor_orders WHERE vendor_id = ${vendorId}
      GROUP BY status ORDER BY count DESC, status
    `,
    sql`
      SELECT oi.product_id, oi.product_name, SUM(oi.quantity)::int AS units,
        SUM(oi.line_total_cents)::int AS revenue_cents
      FROM order_items oi INNER JOIN vendor_orders vo ON vo.id = oi.vendor_order_id
      WHERE vo.vendor_id = ${vendorId} AND vo.status = 'delivered'
        AND vo.created_at >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY oi.product_id, oi.product_name
      ORDER BY revenue_cents DESC, units DESC, oi.product_name LIMIT 5
    `,
  ]);

  const summary = (Array.isArray(summaryRows) ? summaryRows[0] : {}) as Record<string, number>;
  const daily = (Array.isArray(dailyRows) ? dailyRows : []) as Array<Record<string, string | number>>;
  const statuses = (Array.isArray(statusRows) ? statusRows : []) as Array<Record<string, string | number>>;
  const topProducts = (Array.isArray(productRows) ? productRows : []) as Array<Record<string, string | number | null>>;
  response.json({
    analytics: {
      period: { days: 30, from: daily[0]?.date, to: daily[daily.length - 1]?.date },
      summary: {
        deliveredOrders: summary.delivered_orders ?? 0,
        revenueCents: summary.revenue_cents ?? 0,
        averageOrderCents: summary.average_order_cents ?? 0,
        unitsSold: summary.units_sold ?? 0,
        currency: 'LKR',
      },
      daily: daily.map((row) => ({ date: row.date, orders: row.orders, revenueCents: row.revenue_cents })),
      orderStatuses: statuses.map((row) => ({ status: row.status, count: row.count })),
      topProducts: topProducts.map((row) => ({ productId: row.product_id, productName: row.product_name, units: row.units, revenueCents: row.revenue_cents })),
    },
  });
});

vendorInsightsRouter.post('/ai/product-description', async (request, response) => {
  const parsed = productDescriptionDraftSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('Provide enough product detail to create a useful draft.', 400, 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }
  response.json({ draft: await generateProductDescription(parsed.data) });
});
