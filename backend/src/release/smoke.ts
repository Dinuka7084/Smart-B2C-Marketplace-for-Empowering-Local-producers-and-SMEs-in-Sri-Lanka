import 'dotenv/config';

import assert from 'node:assert/strict';

const baseUrl = (process.env.SMOKE_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const frontendOrigin = process.env.SMOKE_FRONTEND_ORIGIN ?? 'http://localhost:3000';

const request = (path: string, init: RequestInit = {}, cookie?: string) => fetch(`${baseUrl}${path}`, {
  ...init,
  headers: {
    Accept: 'application/json',
    Origin: frontendOrigin,
    ...(cookie ? { Cookie: cookie } : {}),
    ...init.headers,
  },
});

const expectStatus = async (path: string, expected: number, init?: RequestInit, cookie?: string) => {
  const response = await request(path, init, cookie);
  assert.equal(response.status, expected, `${init?.method ?? 'GET'} ${path} returned ${response.status}`);
  return response;
};

const login = async (email: string, password: string, expectedRole: string) => {
  const response = await expectStatus('/api/v1/auth/login', 200, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json() as { user?: { role?: string } };
  assert.equal(body.user?.role, expectedRole, `${email} did not have the expected role`);
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(cookie, `Login for ${email} did not return a session cookie`);
  return cookie;
};

const logout = (cookie: string) => expectStatus('/api/v1/auth/logout', 204, { method: 'POST' }, cookie);

const health = await expectStatus('/health', 200);
assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
assert.ok(health.headers.get('x-request-id'));
await expectStatus('/api/v1', 200);
await expectStatus('/api/v1/products?page=1&pageSize=1', 200);
await expectStatus('/api/v1/cart', 401);

const demoPassword = process.env.DEMO_SEED_PASSWORD;
if (demoPassword) {
  const customerCookie = await login('customer.demo@smartlanka.lk', demoPassword, 'customer');
  await expectStatus('/api/v1/cart', 200, {}, customerCookie);
  await expectStatus('/api/v1/recommendations', 200, {}, customerCookie);
  await logout(customerCookie);

  const vendorCookie = await login('vendor.demo@smartlanka.lk', demoPassword, 'vendor');
  await expectStatus('/api/v1/vendor/products', 200, {}, vendorCookie);
  await expectStatus('/api/v1/vendor/analytics', 200, {}, vendorCookie);
  await logout(vendorCookie);
} else {
  console.warn('Skipped demo role checks because DEMO_SEED_PASSWORD is not configured.');
}

if (process.env.SMOKE_ADMIN_EMAIL && process.env.SMOKE_ADMIN_PASSWORD) {
  const adminCookie = await login(process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD, 'admin');
  await expectStatus('/api/v1/admin/vendors/pending', 200, {}, adminCookie);
  await logout(adminCookie);
} else {
  console.warn('Skipped administrator checks because SMOKE_ADMIN credentials are not configured.');
}

console.log('Smart Lanka API smoke checks passed.');
