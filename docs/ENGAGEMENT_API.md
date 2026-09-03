# Wishlist and Notification API

All routes below use the `/api/v1` prefix and require an authenticated customer session.

## Wishlist

- `GET /wishlist` lists the customer's saved products with current price, availability, category, and vendor details.
- `POST /wishlist/items` accepts a published product UUID and saves it idempotently.
- `GET /wishlist/items/:productId` reports whether one product is saved.
- `DELETE /wishlist/items/:productId` removes an item and succeeds when it is already absent.

Wishlist ownership is taken exclusively from the HTTP-only session. A product can only be added while it belongs to an approved vendor, an active category, and the public catalog.

## Notifications

- `GET /notifications` returns up to 50 recent notifications plus `unreadCount`.
- `PATCH /notifications/:notificationId/read` marks one owned notification as read.
- `PATCH /notifications/read-all` marks every unread customer notification as read.

Simulated checkout writes an order-confirmation notification in the checkout transaction. Vendor fulfilment changes write an order-status notification atomically with the status-history event. Notification links point to the customer's owned order-tracking page.
