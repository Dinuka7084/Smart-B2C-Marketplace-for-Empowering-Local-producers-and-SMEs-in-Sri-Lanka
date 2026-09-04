# Disposable transactional end-to-end validation

The backend includes an opt-in release runner that exercises the critical Smart Lanka journey through the HTTP API while using Neon as the authoritative data store.

## Covered workflow

The scenario creates uniquely tagged temporary records and verifies:

1. Vendor and customer registration plus session cookies.
2. Administrator login, pending-vendor visibility, and vendor approval.
3. Administrator category creation and approved-vendor product publication.
4. Public catalog discovery, address creation, cart persistence, and simulated checkout.
5. Checkout idempotency using the same idempotency key twice.
6. Vendor-only order visibility and the `placed -> processing -> shipped -> delivered` audit path.
7. Customer tracking, verified-purchase review creation, and complaint creation.
8. Administrator review moderation and complaint resolution.
9. Customer notifications and session logout.

## Safety controls

- The runner exits unless `E2E_ALLOW_DATABASE_MUTATION=true` is provided explicitly.
- It refuses to run with `NODE_ENV=production`.
- The API target must be `localhost`, `127.0.0.1`, or `::1` unless `E2E_ALLOW_REMOTE=true` is also explicitly provided.
- Emails, slugs, SKUs, names, and logs carry a unique run identifier.
- A `finally` cleanup removes the exact review, complaint, payment, checkout, users, product (through vendor cascade), and category created by the run.
- It never alters existing accounts, products, categories, or orders.

The runner intentionally mutates the configured database for the duration of the test. Use a Neon development or staging branch, never the production branch.

## Run locally

Start the backend with its normal non-production `.env`, then use another terminal:

```powershell
cd backend
$env:E2E_ALLOW_DATABASE_MUTATION = "true"
npm run release:e2e
Remove-Item Env:E2E_ALLOW_DATABASE_MUTATION
```

If the API is listening on a different local port, set `E2E_BASE_URL` for that terminal. `E2E_FRONTEND_ORIGIN` must match the backend's configured `FRONTEND_URL`, because unsafe cookie-authenticated requests are origin-protected.

## Failure recovery

Cleanup still runs when an assertion or API request fails. If cleanup itself cannot reach Neon, the console prints the unique run identifier. Locate only records containing that identifier before removing them manually; do not use broad wildcard deletion against a shared database.

