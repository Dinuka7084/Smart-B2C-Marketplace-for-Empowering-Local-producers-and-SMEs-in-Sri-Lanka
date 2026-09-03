# Simulated Checkout API

These `/api/v1` routes require an authenticated customer session.

## Addresses

- `GET /addresses` lists saved delivery addresses owned by the customer.
- `POST /addresses` validates and stores a delivery address. A newly selected default clears the customer's previous default.

## Checkout

- `POST /checkout` accepts `addressId`, `paymentMethod: "simulated"`, and a client-generated UUID `idempotencyKey`.
- `GET /orders` returns the customer's checkout history.
- `GET /orders/:orderId` returns the address snapshot and vendor-order groups for one owned checkout.

Each vendor-order group includes its chronological `history`, allowing the customer interface to show placed, processing, shipped, delivered, or cancelled events and vendor notes.

## Vendor fulfilment

These routes require an authenticated, approved vendor session:

- `GET /vendor/orders` lists only the vendor's child orders, immutable item snapshots, delivery details, and currently allowed next statuses.
- `PATCH /vendor/orders/:orderId/status` accepts `nextStatus` and an optional `note`. Cancellation requires a reason.

The server permits `placed → processing → shipped → delivered`, plus cancellation before dispatch. Delivered and cancelled orders are terminal. Ownership and the current database status are checked during every update, and each successful transition writes an audit-history record atomically.

Checkout recalculates every price from Neon, validates publication/vendor/category status, and rechecks inventory. A serializable Neon HTTP transaction conditionally decrements stock, creates one parent checkout, creates one child order per vendor, stores immutable item snapshots and initial status history, records a successful simulated payment, and clears the cart.

Repeated requests with the same idempotency key return the existing order rather than charging or creating an order twice. A stock conflict rolls the complete transaction back.

The academic delivery fee is currently a fixed LKR 350 per checkout. No real payment credentials or funds are used.
