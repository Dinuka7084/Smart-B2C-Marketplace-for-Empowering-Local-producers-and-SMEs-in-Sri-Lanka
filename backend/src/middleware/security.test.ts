import assert from 'node:assert/strict';
import test from 'node:test';

import { isTrustedBrowserWrite } from './security.ts';

const frontendOrigin = 'https://smart-lanka.example';

test('safe requests and same-origin writes are trusted', () => {
  assert.equal(isTrustedBrowserWrite({ method: 'GET', fetchSite: 'cross-site', hasSession: true, frontendOrigin }), true);
  assert.equal(isTrustedBrowserWrite({ method: 'POST', origin: frontendOrigin, fetchSite: 'same-origin', hasSession: true, frontendOrigin }), true);
});

test('cross-site and originless authenticated writes are rejected', () => {
  assert.equal(isTrustedBrowserWrite({ method: 'PATCH', origin: 'https://attacker.example', fetchSite: 'cross-site', hasSession: true, frontendOrigin }), false);
  assert.equal(isTrustedBrowserWrite({ method: 'DELETE', hasSession: true, frontendOrigin }), false);
  assert.equal(isTrustedBrowserWrite({ method: 'POST', hasSession: false, frontendOrigin }), true);
});
