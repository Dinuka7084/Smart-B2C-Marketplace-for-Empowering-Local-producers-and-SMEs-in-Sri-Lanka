# Administrator Management API

All routes use the `/api/v1/admin` prefix and require an authenticated administrator session.

## Categories

- `GET /categories` lists active and hidden categories with product counts.
- `POST /categories` creates a category with a unique normalized slug.
- `PATCH /categories/:categoryId` edits category metadata or visibility.

Hiding a category immediately removes its products from public catalog queries and prevents vendors from assigning new products to it. Records are retained rather than deleted.

## Users

- `GET /users` lists customer, vendor, and administrator account summaries.
- `PATCH /users/:userId/status` activates or suspends a customer or vendor.

Suspension revokes every active session in the same database batch, and suspended users are rejected during future authentication. Administrator accounts are protected from this endpoint to prevent accidental platform lockout.

## Products

- `GET /products` lists every product with vendor, category, inventory, and publication state.
- `PATCH /products/:productId/status` moves a product to `draft`, `published`, or `archived`.

Publication is rejected unless the product belongs to an approved vendor and an active category. Archiving is recoverable by restoring the product to draft.
