# Demo data and release smoke checks

## Environment validation

From `backend`, run:

```bash
npm run release:check-env
npm run release:check-env:production
```

The local check requires the core database and session configuration. The production check additionally requires an HTTPS frontend origin and rejects the example session-secret placeholder. Missing Groq or Cloudinary configuration is reported without exposing credential values.

## Presentation data

The demo seed is optional and must never be run against production. Set a dedicated non-production password in `backend/.env`:

```dotenv
DEMO_SEED_PASSWORD="use-a-unique-demo-password"
```

Run the normal seed first, followed by the demo seed:

```bash
npm run db:seed
npm run db:seed:demo
```

The idempotent demo seed creates or refreshes:

- `customer.demo@smartlanka.lk`;
- `vendor.demo@smartlanka.lk`, already approved;
- four published products across the default categories;
- opening inventory movements for newly created demo stock;
- a customer delivery address; and
- one wishlist signal so recommendations have a visible personal explanation.

Re-running it updates account and product presentation fields but does not reset existing inventory or duplicate the wishlist/address records.

## API smoke runner

With the backend running, execute:

```bash
npm run release:smoke
```

The runner always verifies health, request/security headers, API metadata, the public catalog, and anonymous cart rejection. When `DEMO_SEED_PASSWORD` is present, it also signs in as the demo customer and vendor, checks their protected read routes, and logs out. Administrator checks are enabled only with explicit `SMOKE_ADMIN_EMAIL` and `SMOKE_ADMIN_PASSWORD` values.

For another environment, set:

```dotenv
SMOKE_BASE_URL="https://api.example.com"
SMOKE_FRONTEND_ORIGIN="https://app.example.com"
```

The smoke runner does not create products, change inventory, place orders, moderate content, or alter fulfilment state.
