# Cart API

All routes use the `/api/v1/cart` prefix and require an authenticated customer session. Vendors and administrators cannot mutate customer carts.

- `GET /` returns the customer's persistent cart, server-calculated totals, current stock, and checkout eligibility.
- `POST /items` adds a published product or increases its existing quantity.
- `PATCH /items/:productId` replaces the quantity of an existing line.
- `DELETE /items/:productId` removes an existing line.

Every add and quantity update verifies that the product is published, its vendor is approved, its category is active, and sufficient inventory is available. Cart items do not reserve stock; checkout must validate inventory again inside the order transaction.

Quantities must be positive integers and cannot exceed 100 units per product. Prices and line totals are calculated from current database values rather than trusted from the frontend.
