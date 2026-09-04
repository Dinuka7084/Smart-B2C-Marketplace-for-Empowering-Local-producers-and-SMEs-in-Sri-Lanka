import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { hashPassword } from '../auth/password.ts';
import { getDb, getSqlClient } from '../db/client.ts';
import { users } from '../db/schema.ts';

type JsonRecord = Record<string, unknown>;

const requireOptIn = (): void => {
  if (process.env.E2E_ALLOW_DATABASE_MUTATION !== 'true') {
    throw new Error('Set E2E_ALLOW_DATABASE_MUTATION=true to run the disposable transactional scenario.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The transactional E2E runner is disabled when NODE_ENV=production.');
  }
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
    throw new Error('DATABASE_URL and SESSION_SECRET are required.');
  }
};

requireOptIn();

const baseUrl = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:4000');
const frontendOrigin = process.env.E2E_FRONTEND_ORIGIN ?? 'http://localhost:3000';
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
if (!localHosts.has(baseUrl.hostname) && process.env.E2E_ALLOW_REMOTE !== 'true') {
  throw new Error('E2E_BASE_URL must use localhost unless E2E_ALLOW_REMOTE=true is explicitly set.');
}

baseUrl.pathname = baseUrl.pathname.replace(/\/$/, '');
const runId = randomUUID().replaceAll('-', '').slice(0, 12);
const password = `E2e-${randomUUID()}-Pass!`;

let adminUserId: string | undefined;
let vendorUserId: string | undefined;
let customerUserId: string | undefined;
let categoryId: string | undefined;
let checkoutOrderId: string | undefined;

const endpoint = (path: string): string => `${baseUrl.toString().replace(/\/$/, '')}${path}`;

class ApiClient {
  private cookie?: string;

  async request<T extends JsonRecord>(
    path: string,
    expectedStatus: number | number[],
    init: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    headers.set('Origin', frontendOrigin);
    if (this.cookie) headers.set('Cookie', this.cookie);

    const response = await fetch(endpoint(path), { ...init, headers });
    const setCookie = response.headers.get('set-cookie')?.split(';', 1)[0];
    if (setCookie) this.cookie = setCookie;

    const text = await response.text();
    let body: JsonRecord = {};
    if (text) {
      try {
        body = JSON.parse(text) as JsonRecord;
      } catch {
        body = { raw: text };
      }
    }

    const accepted = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!accepted.includes(response.status)) {
      throw new Error(
        `${init.method ?? 'GET'} ${path} returned ${response.status}; expected ${accepted.join(' or ')}. ${JSON.stringify(body)}`,
      );
    }
    return body as T;
  }

  json<T extends JsonRecord>(path: string, expectedStatus: number | number[], body: JsonRecord): Promise<T> {
    return this.request<T>(path, expectedStatus, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  patch<T extends JsonRecord>(path: string, expectedStatus: number, body: JsonRecord): Promise<T> {
    return this.request<T>(path, expectedStatus, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
}

const register = async (
  client: ApiClient,
  role: 'customer' | 'vendor',
): Promise<{ id: string }> => {
  const vendorFields = role === 'vendor'
    ? {
        businessName: `E2E Producers ${runId}`,
        storeSlug: `e2e-producers-${runId}`,
        registrationNumber: `E2E-${runId}`,
        description: 'Disposable producer account created by the Smart Lanka release validation runner.',
      }
    : {};
  const body = await client.json<{ user: { id: string; role: string; vendorApprovalStatus: string | null } }>(
    '/api/v1/auth/register',
    201,
    {
      email: `e2e-${role}-${runId}@example.invalid`,
      password,
      firstName: 'Release',
      lastName: role === 'vendor' ? 'Vendor' : 'Customer',
      phone: '+94770000000',
      role,
      ...vendorFields,
    },
  );
  assert.equal(body.user.role, role);
  if (role === 'vendor') assert.equal(body.user.vendorApprovalStatus, 'pending');
  return body.user;
};

const cleanup = async (): Promise<void> => {
  const sql = getSqlClient();
  await sql.transaction((transaction) => {
    const queries = [];
    if (checkoutOrderId) {
      queries.push(transaction`DELETE FROM reviews WHERE customer_id = ${customerUserId}`);
      queries.push(transaction`DELETE FROM complaints WHERE checkout_order_id = ${checkoutOrderId}`);
      queries.push(transaction`DELETE FROM payments WHERE checkout_order_id = ${checkoutOrderId}`);
      queries.push(transaction`DELETE FROM checkout_orders WHERE id = ${checkoutOrderId}`);
    }
    if (customerUserId) queries.push(transaction`DELETE FROM users WHERE id = ${customerUserId}`);
    if (vendorUserId) queries.push(transaction`DELETE FROM users WHERE id = ${vendorUserId}`);
    if (adminUserId) queries.push(transaction`DELETE FROM users WHERE id = ${adminUserId}`);
    if (categoryId) queries.push(transaction`DELETE FROM categories WHERE id = ${categoryId}`);
    return queries;
  });
};

const admin = new ApiClient();
const vendor = new ApiClient();
const customer = new ApiClient();

try {
  adminUserId = randomUUID();
  await getDb().insert(users).values({
    id: adminUserId,
    email: `e2e-admin-${runId}@example.invalid`,
    passwordHash: await hashPassword(password),
    role: 'admin',
    firstName: 'Release',
    lastName: 'Administrator',
  });

  const vendorUser = await register(vendor, 'vendor');
  vendorUserId = vendorUser.id;
  const customerUser = await register(customer, 'customer');
  customerUserId = customerUser.id;

  const login = await admin.json<{ user: { id: string; role: string } }>('/api/v1/auth/login', 200, {
    email: `e2e-admin-${runId}@example.invalid`,
    password,
  });
  assert.equal(login.user.id, adminUserId);
  assert.equal(login.user.role, 'admin');

  const pending = await admin.request<{ vendors: Array<{ userId: string }> }>('/api/v1/admin/vendors/pending', 200);
  assert.ok(pending.vendors.some((record) => record.userId === vendorUserId));
  const approved = await admin.patch<{ vendor: { approvalStatus: string } }>(
    `/api/v1/admin/vendors/${vendorUserId}/approval`,
    200,
    { status: 'approved' },
  );
  assert.equal(approved.vendor.approvalStatus, 'approved');

  const category = await admin.json<{ category: { id: string } }>('/api/v1/admin/categories', 201, {
    name: `E2E Category ${runId}`,
    slug: `e2e-category-${runId}`,
    description: 'Disposable category for the transactional release scenario.',
    isActive: true,
  });
  categoryId = category.category.id;

  const product = await vendor.json<{ product: { id: string } }>('/api/v1/vendor/products', 201, {
    name: `E2E Ceylon Product ${runId}`,
    slug: `e2e-ceylon-product-${runId}`,
    sku: `E2E-${runId}`,
    categoryId,
    description: 'A disposable locally made product used to verify the complete Smart Lanka transaction flow.',
    priceLkr: 1250,
    status: 'published',
    stock: 5,
    lowStockThreshold: 2,
  });
  const productId = product.product.id;

  const catalog = await customer.request<{ products: Array<{ id: string }> }>(
    `/api/v1/products?q=${encodeURIComponent(runId)}`,
    200,
  );
  assert.ok(catalog.products.some((record) => record.id === productId));

  const address = await customer.json<{ address: { id: string } }>('/api/v1/addresses', 201, {
    label: 'E2E Delivery',
    recipientName: 'Release Customer',
    phone: '+94770000000',
    line1: '100 Galle Road',
    city: 'Colombo',
    district: 'Colombo',
    postalCode: '00300',
    isDefault: true,
  });
  await customer.json('/api/v1/cart/items', 201, { productId, quantity: 1 });

  const idempotencyKey = randomUUID();
  const checkout = await customer.json<{
    order: { id: string; reference: string; vendors: Array<{ id: string; status: string }> };
  }>('/api/v1/checkout', 201, {
    addressId: address.address.id,
    paymentMethod: 'simulated',
    idempotencyKey,
  });
  checkoutOrderId = checkout.order.id;
  assert.equal(checkout.order.vendors.length, 1);
  assert.equal(checkout.order.vendors[0]?.status, 'placed');

  const duplicate = await customer.json<{ order: { id: string } }>('/api/v1/checkout', 200, {
    addressId: address.address.id,
    paymentMethod: 'simulated',
    idempotencyKey,
  });
  assert.equal(duplicate.order.id, checkoutOrderId, 'Idempotent checkout returned a different order.');

  const vendorOrders = await vendor.request<{ orders: Array<{ id: string; reference: string }> }>(
    '/api/v1/vendor/orders',
    200,
  );
  const childOrder = vendorOrders.orders.find((record) => record.reference === checkout.order.reference);
  assert.ok(childOrder, 'The vendor could not see its child order.');
  for (const nextStatus of ['processing', 'shipped', 'delivered']) {
    const transitionResult: { order: { status: string } } = await vendor.patch(
      `/api/v1/vendor/orders/${childOrder.id}/status`,
      200,
      { nextStatus, note: `Disposable E2E transition to ${nextStatus}.` },
    );
    assert.equal(transitionResult.order.status, nextStatus);
  }

  const tracked = await customer.request<{
    order: { id: string; vendors: Array<{ status: string; history: Array<{ nextStatus: string }> }> };
  }>(`/api/v1/orders/${checkoutOrderId}`, 200);
  assert.equal(tracked.order.vendors[0]?.status, 'delivered');
  assert.ok(tracked.order.vendors[0]?.history.some((record) => record.nextStatus === 'delivered'));

  const review = await customer.json<{ review: { id: string; status: string } }>('/api/v1/reviews', 201, {
    productId,
    rating: 5,
    comment: 'Verified by the disposable Smart Lanka end-to-end release scenario.',
  });
  assert.equal(review.review.status, 'pending');
  const complaint = await customer.json<{ complaint: { id: string; status: string } }>('/api/v1/complaints', 201, {
    checkoutOrderId,
    subject: 'Disposable E2E support case',
    description: 'This temporary complaint verifies the complete administrator support workflow and cleanup.',
  });
  assert.equal(complaint.complaint.status, 'open');

  const pendingReviews = await admin.request<{ reviews: Array<{ id: string }> }>('/api/v1/admin/reviews/pending', 200);
  assert.ok(pendingReviews.reviews.some((record) => record.id === review.review.id));
  const moderated = await admin.patch<{ review: { status: string } }>(
    `/api/v1/admin/reviews/${review.review.id}/moderation`,
    200,
    { status: 'published' },
  );
  assert.equal(moderated.review.status, 'published');
  const resolved = await admin.patch<{ complaint: { status: string } }>(
    `/api/v1/admin/complaints/${complaint.complaint.id}`,
    200,
    { status: 'resolved', resolutionNote: 'Resolved by the disposable E2E release verification.' },
  );
  assert.equal(resolved.complaint.status, 'resolved');

  const notifications = await customer.request<{ notifications: unknown[]; unreadCount: number }>(
    '/api/v1/notifications',
    200,
  );
  assert.ok(notifications.notifications.length >= 5, 'Expected checkout, fulfilment, and support notifications.');
  await customer.patch('/api/v1/notifications/read-all', 200, {});

  await Promise.all([
    admin.request('/api/v1/auth/logout', 204, { method: 'POST' }),
    vendor.request('/api/v1/auth/logout', 204, { method: 'POST' }),
    customer.request('/api/v1/auth/logout', 204, { method: 'POST' }),
  ]);

  console.log(`Smart Lanka transactional E2E passed (${runId}).`);
} finally {
  try {
    await cleanup();
    console.log(`Disposable E2E records cleaned (${runId}).`);
  } catch (error) {
    console.error(`E2E cleanup failed for run ${runId}. Remove records tagged with this run id manually.`, error);
    process.exitCode = 1;
  }
}
