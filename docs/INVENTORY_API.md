# Vendor inventory API

All routes use the `/api/v1/vendor` prefix and require an authenticated vendor whose application is approved. A vendor can read or change only inventory belonging to their own products.

## List inventory and movement history

`GET /inventory` returns every owned product with its available quantity, reserved quantity, low-stock threshold, and update time. It also returns the latest 100 inventory movements across those products, newest first.

A product is considered low stock when `availableQuantity <= lowStockThreshold`.

## Adjust a product's inventory

`PATCH /products/:productId/inventory`

Example body:

```json
{
  "availableQuantity": 24,
  "lowStockThreshold": 5,
  "note": "Restocked after weekly delivery"
}
```

`availableQuantity` must be a nonnegative integer. `lowStockThreshold` is optional and must also be nonnegative. A note is optional, but when supplied it must contain 3–500 characters.

Changing the available quantity creates an immutable movement record in the same database statement. An increase is classified as `restock`; a decrease is classified as `adjustment`. Threshold-only changes do not create a quantity movement.

## Read dashboard metrics

`GET /metrics` returns:

- `publishedProducts`: currently published products owned by the vendor.
- `ordersToFulfil`: vendor orders in `placed` or `processing` state.
- `lowStock`: owned products at or below their configured threshold.
- `deliveredRevenueCents`: subtotal revenue from delivered vendor orders.
- `currency`: `LKR`.

## Ledger rules

- New products with positive opening stock create an `initial` movement.
- Manual vendor increases create `restock` movements; decreases create `adjustment` movements.
- Successful simulated checkout creates a `sale` movement atomically with each stock reduction.
- Movement rows preserve their signed delta, before/after quantities, actor when applicable, note, and timestamp.
- Existing stock created before this ledger migration is not given fabricated historical movements.
