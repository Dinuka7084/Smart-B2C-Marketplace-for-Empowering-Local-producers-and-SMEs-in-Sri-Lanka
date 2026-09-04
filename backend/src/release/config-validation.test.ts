import assert from 'node:assert/strict';
import test from 'node:test';

import { validateReleaseConfig } from './config-validation.ts';

test('production release configuration requires HTTPS and real core secrets', () => {
  const result = validateReleaseConfig({
    frontendUrl: 'http://smart-lanka.example',
    databaseUrl: 'postgresql://database.example/app',
    sessionSecret: 'replace-with-a-long-random-session-secret',
  }, true);
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors.some((error) => error.includes('HTTPS')));
  assert.ok(result.errors.some((error) => error.includes('placeholder')));
});

test('optional integrations warn when absent and reject partial Cloudinary setup', () => {
  const result = validateReleaseConfig({
    frontendUrl: 'https://smart-lanka.example',
    databaseUrl: 'postgresql://database.example/app',
    sessionSecret: 'a-genuinely-random-session-secret-value',
    cloudinaryCloudName: 'smart-lanka',
  }, true);
  assert.equal(result.errors.length, 1);
  assert.ok(result.warnings.some((warning) => warning.includes('Groq')));
});
