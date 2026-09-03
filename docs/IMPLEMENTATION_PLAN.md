# Smart B2C Marketplace - Implementation Plan

## 1. Product goal

Build a responsive multi-vendor marketplace that helps Sri Lankan local producers and SMEs sell directly to customers. The system has three primary roles:

- **Customer:** discover products, maintain a cart and wishlist, place and track orders, review purchases, and receive notifications.
- **Vendor:** manage a storefront, products, inventory, orders, customers, analytics, and AI-assisted product content.
- **Administrator:** approve vendors, manage users and categories, monitor products and platform activity, handle complaints, view reports, and manage vendor rankings.

The initial release will be English-first, use Sri Lankan rupees (LKR), and use Neon PostgreSQL as the authoritative database.

## 2. Delivery principles

- Build one complete vertical slice at a time rather than creating many disconnected screens.
- Keep role permissions enforced on the server, not only hidden in the interface.
- Keep checkout, stock changes, payment records, and order status history auditable.
- Use realistic seeded demo data so every milestone can be reviewed without manual setup.
- Treat AI features as assistive: generated content and recommendations require clear fallbacks and never silently change business data.
- Maintain a usable mobile experience because customers and small vendors may primarily use phones.

## 3. Proposed technical architecture

### Application

- One Git repository with completely independent `frontend` and `backend` Node.js projects.
- `frontend`: TypeScript Vite/React single-page application with Tailwind CSS and accessible UI primitives.
- `backend`: TypeScript Express.js HTTP API that exclusively owns authentication, business rules, Neon, Groq, and Cloudinary access.
- The frontend communicates with the backend through versioned `/api/v1` endpoints and never receives service credentials.

### Data

- Neon PostgreSQL using an HTTP-compatible serverless driver.
- Drizzle ORM for typed schema, queries, and SQL migrations.
- Seed script for categories, approved vendors, products, reviews, and demo accounts.
- Cloudinary for product images; local placeholders are acceptable only during the first development slice.

### Security and quality

- Email/password authentication with secure password hashing and HTTP-only sessions.
- Server-side role and ownership checks for customer, vendor, and administrator actions.
- Zod validation at every mutation boundary.
- Rate limiting for authentication, reviews, complaints, and AI endpoints.
- Automated unit/integration tests for pricing, inventory, permissions, and order state transitions.
- End-to-end tests for the three critical journeys: customer purchase, vendor fulfillment, and admin vendor approval.

## 4. Core data model

### Identity and profiles

- `users`: identity, email, password hash, role, account status, verification timestamps.
- `sessions`: hashed session token, user, expiry, device metadata.
- `customer_profiles`: customer-specific profile details.
- `vendor_profiles`: business identity, contact details, approval status, approval audit fields, store slug and description.
- `addresses`: reusable billing/shipping addresses owned by a user.

### Catalog and inventory

- `categories`: hierarchical product categories with active status.
- `products`: vendor-owned product details, status, pricing, SKU, category, AI-content provenance, timestamps.
- `product_images`: ordered image metadata and alt text.
- `inventory`: current available/reserved quantities per product.
- `inventory_movements`: auditable stock additions, reservations, releases, sales, and corrections.

### Shopping and orders

- `carts` and `cart_items`: one active cart per customer.
- `wishlists` and `wishlist_items`: saved customer products.
- `checkout_orders`: the customer's overall checkout, totals, addresses, and payment state.
- `vendor_orders`: one child order per vendor for independent fulfillment and status tracking.
- `order_items`: immutable purchase snapshots of product name, SKU, unit price, quantity, and totals.
- `order_status_history`: actor, previous status, next status, timestamp, and optional note.
- `payments`: provider reference, amount, state, method, and webhook audit data.

### Engagement and administration

- `reviews`: verified-purchase ratings and moderated comments.
- `notifications`: per-user notification type, payload, read state, and timestamp.
- `complaints`: customer issue, related order/vendor, workflow status, and admin resolution.
- `vendor_metric_snapshots` and `vendor_rankings`: transparent ranking inputs and computed score history.
- `learning_resources`: admin-managed vendor learning content.
- `ai_generation_logs`: feature, input reference, model/provider metadata, status, and accepted output.

## 5. Main routes and surfaces

### Public/customer

- `/` marketplace home and featured/local products
- `/products` search, category filters, sorting, and pagination
- `/products/[slug]` product details, vendor summary, reviews, cart/wishlist actions
- `/cart` cart management and totals
- `/checkout` address, delivery, payment, and confirmation
- `/account` customer overview
- `/account/orders` order history and tracking
- `/account/wishlist`, `/account/notifications`, `/account/profile`

### Vendor

- `/vendor` business overview and actionable alerts
- `/vendor/products` catalog CRUD and AI description assistance
- `/vendor/inventory` stock controls and low-stock alerts
- `/vendor/orders` order queue, details, and valid status transitions
- `/vendor/customers` order-linked customer summaries with privacy limits
- `/vendor/analytics` sales, product, inventory, and review insights
- `/vendor/learning` learning hub

### Administrator

- `/admin` platform overview
- `/admin/vendors` approval and vendor management
- `/admin/users`, `/admin/categories`, `/admin/products`
- `/admin/complaints`, `/admin/notifications`, `/admin/reports`
- `/admin/vendor-rankings` ranking inputs, results, and explanation
- `/admin/system` security and activity monitoring

## 6. Milestones

### Milestone 0 - Foundation and decisions

**Output:** running project, environment template, architecture notes, initial design tokens, quality scripts, and an agreed decision log.

**Acceptance:** application starts locally; production build succeeds; no credentials are committed.

### Milestone 1 - Identity, database, and role shell

**Output:** Neon connection, first migrations, seed data, registration/login/logout, customer/vendor onboarding, pending-vendor state, protected customer/vendor/admin layouts.

**Acceptance:** each role reaches only its allowed area; vendor accounts remain restricted until approved; seed admin can approve a vendor.

### Milestone 2 - Catalog and customer discovery

**Output:** categories, vendor product CRUD, inventory basics, marketplace home, product listing/search/filter/sort, product detail page, image handling.

**Acceptance:** an approved vendor can publish an in-stock product and a customer can find and view it on desktop and mobile.

### Milestone 3 - Cart, wishlist, and transactional ordering

**Output:** persisted cart/wishlist, checkout totals, addresses, multi-vendor order split, inventory reservation, order confirmation, customer order history.

**Acceptance:** a customer can place one checkout containing products from multiple vendors without overselling stock; each vendor sees only its child order.

### Milestone 4 - Payment and fulfillment

**Output:** selected payment provider in test mode, webhook verification, payment records, vendor status transitions, customer tracking, notifications, cancellation/refund rules.

**Acceptance:** payment events are idempotent; invalid status transitions are rejected; the order timeline is auditable.

### Milestone 5 - Reviews, complaints, and admin operations

**Output:** verified-purchase reviews, moderation, complaint workflow, user/category/product management, admin reporting and platform notifications.

**Acceptance:** only eligible customers can review; admins can resolve complaints and trace the relevant order/vendor.

### Milestone 6 - Analytics and smart features

**Output:** vendor analytics, transparent vendor ranking, AI product-description assistant, recommendation baseline, and learning hub. Demand forecasting and pricing recommendations follow only if sufficient historical data exists.

**Acceptance:** analytics reconcile with orders; ranking factors are explainable; every AI workflow has loading, error, and non-AI fallback states.

### Milestone 7 - Hardening and release

**Output:** accessibility/responsive pass, security review, performance tuning, complete tests, backup/recovery notes, production deployment, demo accounts, and presentation-ready seed scenario.

**Acceptance:** production build and critical end-to-end tests pass; secrets are configured outside source control; core flows work on phone and desktop widths.

## 7. Recommended first vertical slice

The first implementation slice should prove the architecture without overbuilding:

1. Establish the application shell and marketplace visual system.
2. Connect Neon through environment variables and add the identity/vendor/category/product schema.
3. Seed one admin, one approved vendor, one pending vendor, three categories, and six products.
4. Implement authentication and role-aware navigation.
5. Implement admin vendor approval.
6. Implement vendor product creation.
7. Display the created product in the public catalog.

This gives a demonstrable end-to-end flow before cart, payment, AI, and analytics complexity is introduced.

## 8. Confirmed implementation decisions

- The product name is Smart Lanka; the current forest-green and turmeric visual direction remains the initial brand system.
- The academic release uses a simulated checkout rather than a live payment gateway.
- Groq powers AI features; its API key will be supplied through the backend `.env` file, with deterministic/demo fallbacks during development.
- Cloudinary stores product images; the first product-management slice will use signed vendor uploads.
- The frontend and backend are independently installed and runnable projects inside one Git repository; no root npm workspace is used.
- Final hosting remains open until the deployment milestone.

## 9. Definition of done for every milestone

- Database changes include a reviewed migration and seed/update path.
- Authorization and validation are tested for both allowed and forbidden cases.
- Loading, empty, success, and error states are present for the implemented flow.
- Mobile and keyboard behavior are usable.
- The production build passes and the milestone demo path is documented.
- The implementation plan and decision log are updated when scope changes.

## 10. Current implementation status

Milestone 1 is in progress. The following identity foundation is implemented:

- Neon/Drizzle schema and initial SQL migration for users, vendor profiles, and sessions.
- Customer and vendor registration with atomic vendor-profile creation.
- Password login using salted `scrypt` hashes and generic invalid-credential responses.
- HTTP-only opaque sessions, logout, and authenticated profile lookup.
- Server-side role guards and an approved-vendor guard for later vendor routes.
- Pending-vendor listing and audited admin approval/rejection endpoints.
- Idempotent administrator seed script and focused authentication tests.
- React Router application routes with session restoration and credentialed API requests.
- Customer and vendor registration, login, logout, and role-aware marketplace navigation.
- Protected customer, vendor, and administrator workspace shells.
- Pending/rejected vendor states that keep seller tools inaccessible until approval.
- Administrator interface for reviewing, approving, and rejecting vendor applications.

The next slice adds categories and the first approved-vendor product-management flow, then displays published products in the public catalog.
