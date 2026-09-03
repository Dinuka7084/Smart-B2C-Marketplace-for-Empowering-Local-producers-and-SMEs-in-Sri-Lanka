# Reviews and Complaint API

All routes use the `/api/v1` prefix. Customer and administrator mutations use the authenticated HTTP-only session for ownership and role checks.

## Verified-purchase reviews

- `GET /products/:slug/reviews` publicly lists published reviews and aggregate rating data.
- `GET /reviews/eligibility/:productId` tells a customer whether they have an unreviewed delivered purchase.
- `POST /reviews` accepts `productId`, a 1–5 integer `rating`, and a 10–1000 character `comment`.
- `GET /admin/reviews/pending` lists the moderation queue.
- `PATCH /admin/reviews/:reviewId/moderation` publishes or rejects a pending review.

Review eligibility is proven by joining the authenticated customer to an immutable order item whose vendor order is delivered. A customer can review each product once. New reviews remain pending and never appear publicly before administrator approval.

## Customer complaints

- `GET /complaints` lists complaints owned by the customer.
- `POST /complaints` opens a complaint against one checkout owned by that customer.
- `GET /admin/complaints` lists the administrator support queue.
- `PATCH /admin/complaints/:complaintId` moves an open complaint into review, resolves it, or dismisses it.

Resolved and dismissed decisions require a response note and are terminal. Status updates create a customer notification in the same database statement as the complaint update.
