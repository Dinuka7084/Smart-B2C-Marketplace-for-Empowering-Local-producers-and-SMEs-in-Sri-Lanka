# Smart Lanka Complete Project and Viva Guide

## Smart B2C Marketplace for Empowering Local Producers and SMEs in Sri Lanka

This document explains the complete as-built Smart Lanka web application and prepares every team member to present and defend their assigned component during the CSE5015 viva. Smart Lanka is a role-based multi-vendor marketplace. React provides the browser interface, Express owns authentication and business rules, Neon PostgreSQL is the source of truth, Groq assists vendors with product descriptions, and Cloudinary supports product images.

The proposal and the final implementation are not identical. The proposal mentioned MySQL, but the confirmed application uses Neon PostgreSQL. Simulated academic payment, explainable customer recommendations, vendor analytics, and Groq description drafting are implemented. Automated vendor ranking, demand forecasting, pricing recommendations, the learning hub, live payment, and final hosting configuration are not complete. A strong viva answer must describe this difference honestly.

## 1 Project Identity

### 1.1 Problem statement

Sri Lankan local producers and small and medium enterprises often have limited digital reach, fragmented sales channels, and little access to useful business information. Customers may struggle to discover authentic local products through a consistent and trustworthy purchasing process. Smart Lanka creates one marketplace where approved producers can publish products and manage fulfilment while customers can discover, purchase, track, review, and raise support cases.

### 1.2 Proposed solution

Smart Lanka is an English-first responsive B2C web application with three roles: customer, vendor, and administrator. Vendor tools remain locked until an administrator approves the business. One customer checkout can contain products from multiple vendors, but the system creates a separate child order for each vendor. Inventory, payments, order state changes, notifications, reviews, and complaints are stored in an auditable form.

### 1.3 Aim

The aim is to design and implement a secure, usable, and explainable multi-vendor marketplace that helps local producers and SMEs sell online while giving customers a dependable buying experience and administrators effective platform controls.

### 1.4 Objectives

- Provide secure registration, login, logout, and server-enforced role access.
- Allow administrators to approve vendors and manage users, categories, products, reviews, and complaints.
- Allow approved vendors to manage products, images, stock, orders, and business analytics.
- Allow customers to browse, search, save, purchase, track, review, and obtain support for products.
- Prevent overselling and duplicate checkout through transactions and idempotency.
- Use explainable recommendations and editable AI-generated descriptions with reliable fallbacks.
- Deliver a responsive and keyboard-usable interface with tests, release checks, and recovery guidance.

### 1.5 Stakeholders

| Stakeholder | Main need | Smart Lanka response |
|---|---|---|
| Customer | Trustworthy discovery and purchasing | Approved sellers, stock checks, tracking, verified reviews, complaints |
| Vendor | Online reach and manageable operations | Onboarding, products, inventory, fulfilment, analytics, AI drafting |
| Administrator | Marketplace quality and control | Vendor approval, user and catalog controls, moderation, support |
| Project team | Maintainable academic software | Separated projects, typed contracts, migrations, tests, documentation |
| Evaluator | Evidence of analysis, implementation, and evaluation | Traceable scope, working demonstration, test evidence, viva ownership |

### 1.6 Development methodology

The project follows Agile incremental development. Work was delivered as vertical slices, meaning each slice connected the user interface, API, authorization, database rules, and tests for one usable journey. This reduced the risk of producing disconnected screens. The two independent applications live in one Git repository so the team can coordinate versions and documentation without mixing frontend and backend dependencies.

### 1.7 As-built scope

| Status | Capabilities |
|---|---|
| Implemented | Authentication and RBAC, vendor approval, catalog, Cloudinary image flow, inventory ledger, cart, wishlist, addresses, simulated checkout, multi-vendor orders, fulfilment tracking, notifications, reviews, complaints, admin management, vendor analytics, Groq descriptions, deterministic recommendations, security controls, and release checks |
| Configuration dependent | Neon needs DATABASE_URL, Groq needs GROQ_API_KEY, and Cloudinary needs its three credentials |
| Deferred or excluded | Live payment, vendor ranking, demand forecasting, pricing recommendations, learning hub, production hosting configuration, and completed real restore drill |

## 2 Users and Functional Requirements

### 2.1 Customer functions

| Function | Customer action | System response |
|---|---|---|
| Registration and login | Create an account and sign in | Validate input, hash the password, and create an opaque session |
| Catalog | Search, filter, sort, paginate, and view products | Return only published products from approved vendors and active categories |
| Cart | Add, update, and remove products | Persist the cart and recheck product, vendor, category, and stock state |
| Wishlist | Save a product or move it to cart | Maintain a customer-owned wishlist with idempotent saving |
| Checkout | Choose an address and simulated payment | Calculate totals, reduce stock atomically, create payment and split orders |
| Tracking | View order history and details | Show every vendor shipment and audited timeline |
| Reviews | Review a delivered product | Permit one review per customer and product after a delivered purchase |
| Complaints | Open and follow a support case | Link it to the customer's own checkout and show the admin response |
| Recommendations | View suggested products | Rank eligible items by affinity, popularity, and freshness with reasons |
| Notifications | Read order and support updates | Store persistent events and unread state |

### 2.2 Vendor functions

- Register with business name, store slug, registration number, and description.
- Remain in a pending state until an administrator approves the profile.
- Create and edit only owned products using active categories and LKR prices.
- Request a signed Cloudinary upload only for an owned product.
- Set available stock and low-stock threshold while preserving an inventory ledger.
- See only the vendor's own child orders and necessary delivery information.
- Move orders through permitted processing, shipped, delivered, or cancellation states.
- Review 30-day revenue, daily sales, current order states, and best-selling products.
- Request an editable Groq product-description draft while retaining a manual workflow.

### 2.3 Administrator functions

- Review pending vendor businesses and approve or reject them with audit information.
- Suspend or reactivate customer and vendor accounts and revoke sessions on suspension.
- Create, edit, and hide categories without destroying historical order information.
- Monitor products and control draft, published, and archived states.
- Publish or reject pending verified-purchase reviews.
- Review, resolve, or dismiss complaints with required resolution notes.
- Review platform summaries and operational data. Automated ranking and advanced reports remain future work.

### 2.4 Role authorization matrix

| Capability | Guest | Customer | Approved vendor | Administrator |
|---|---|---|---|---|
| Browse catalog | Yes | Yes | Yes | Yes |
| Cart, wishlist, checkout | No | Own data | No | No |
| Customer orders and complaints | No | Own data | No | Moderate |
| Vendor products and inventory | No | No | Own data | Monitor |
| Vendor fulfilment and analytics | No | No | Own data | Oversight |
| Vendor approval and user controls | No | No | No | Yes |

## 3 Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Vite, React, TypeScript | Fast development, reusable components, typed client models, optimized builds |
| Routing | React Router | Public and protected navigation with lazy-loaded pages |
| UI | Tailwind CSS and accessible primitives | Responsive design, consistent tokens, reusable interactions |
| Backend | Node.js, Express.js, TypeScript | Familiar REST framework with explicit middleware and typed code |
| Validation | Zod | Rejects invalid input at every mutation boundary |
| Database | Neon PostgreSQL | Managed relational storage with transactions and constraints |
| Data access | Drizzle ORM and SQL migrations | Typed schema and queries plus direct SQL for advanced transactions |
| AI | Groq API | Fast hosted language model for optional description drafting |
| Images | Cloudinary | Secure image storage and direct delivery using signed uploads |
| Quality | Node test runner, TypeScript, Oxlint, Vite build, smoke and E2E | Validates rules, compilation, API health, and live journeys |

### 3.1 Why Express

Express was selected instead of Hono because it is familiar to the team, widely documented, and well suited to a middleware-based REST API. Express middleware cleanly separates security headers, CORS, JSON parsing, authentication, role checks, approval checks, rate limiting, route handlers, and error handling.

### 3.2 Why Vite and React

React supports reusable, stateful interfaces for customer, vendor, and administrator workflows. TypeScript documents the data expected from the API. Vite provides a fast development server and an optimized production build without coupling the browser application to the backend.

### 3.3 Why Neon and PostgreSQL

Neon offers managed PostgreSQL suitable for development and deployment. PostgreSQL provides transactions, foreign keys, check constraints, enumerations, indexes, and strong concurrency behavior. Neon is accessed only by Express, so the database connection string never reaches the browser.

### 3.4 Why Drizzle

Drizzle keeps the schema and normal queries typed in TypeScript and produces reviewable SQL migrations. Complex operations such as checkout can still use parameterized PostgreSQL SQL where common table expressions and transaction control are helpful.

### 3.5 Why Groq and Cloudinary

Groq gives the academic project a simple hosted language-model integration. It is isolated behind the backend, so the provider could later be replaced. Cloudinary is appropriate for product images because uploads can be signed by Express while image bytes travel directly to the image service. Neither service secret is exposed to React.

## 4 Architecture

### 4.1 Repository structure

The repository contains two completely independent Node.js projects. There is intentionally no root package.json or root node_modules.

| Location | Responsibility |
|---|---|
| frontend | Vite React single-page application, route pages, reusable UI, client models, API helper |
| backend | Express REST API, authentication, business rules, Neon, Groq, Cloudinary |
| backend/drizzle | Ordered SQL migrations that reproduce the database schema |
| docs | Architecture, decisions, API behavior, security, release, backup, demo, and E2E guidance |

### 4.2 Layered architecture

| Layer | Contains | Important boundary |
|---|---|---|
| Presentation | React pages, forms, loading, empty, error, and success states | Never connects directly to Neon or holds service secrets |
| HTTP and middleware | Express routes, CORS, security headers, auth, rate limits | Never trusts client role, ownership, totals, or state |
| Application rules | Validation, calculations, ownership, transitions, recommendation scoring | Applies the same rules regardless of UI behavior |
| Persistence | Drizzle, parameterized SQL, migrations | Stores hashes and auditable records rather than plaintext secrets |
| External services | Neon, Groq, Cloudinary | Credentials remain server-side and optional services have fallbacks |

### 4.3 Request lifecycle

Browser action -> shared typed API helper -> Express security and CORS middleware -> authentication and role check -> Zod validation -> ownership and business-rule checks -> Drizzle or transactional SQL -> JSON response -> React state update and user feedback.

This is defense in depth. Hiding a button in React is useful, but it is not security because browser code can be changed or the API can be called directly. Express repeats every important role, approval, ownership, state, and input check.

### 4.4 REST design

REST matches the system's resources: users, vendors, categories, products, carts, orders, reviews, complaints, and notifications. GET reads, POST creates or triggers a command, PATCH changes part of a resource, and DELETE removes a removable relationship such as a cart or wishlist item. Versioning under `/api/v1` allows future API changes without immediately breaking the current frontend.

## 5 Database Design

### 5.1 Main table groups

| Domain | Tables | Purpose |
|---|---|---|
| Identity | users, sessions, vendor_profiles | Credentials, roles, status, session expiry, vendor approval audit |
| Catalog | categories, products, inventory, inventory_movements | Organization, publication, current stock, and stock history |
| Shopping | carts, cart_items, wishlists, wishlist_items, addresses | Customer-owned pre-purchase state and saved delivery data |
| Ordering | checkout_orders, vendor_orders, order_items, order_status_history, payments | Parent checkout, vendor split, snapshots, timeline, and simulated payment |
| Engagement | notifications, reviews, complaints | Persistent events, verified feedback, and support cases |

### 5.2 Relationships

- One user may own one vendor profile; approval status belongs to that profile.
- One vendor owns many products; one product belongs to one active category.
- Each product has one current inventory record and many inventory movements.
- A customer owns one cart and one wishlist with product join tables.
- One customer may save several delivery addresses.
- One checkout belongs to one customer and contains one or more vendor orders.
- One vendor order contains immutable order items and an ordered status history.
- One checkout has one simulated payment record.
- A review connects a customer, product, and delivered order item.
- A complaint connects a customer to one of the same customer's checkout orders.

### 5.3 Integrity controls

| Control | Example | Purpose |
|---|---|---|
| Primary and foreign keys | Product references vendor and category | Prevent orphan data |
| Unique constraints | Email, slugs, vendor SKU, checkout idempotency key | Prevent duplicates |
| Check constraints | Positive prices and quantities, nonnegative stock | Reject impossible values |
| Enumerations | Roles and product, order, review, complaint states | Restrict state to known values |
| Delete rules | Cascade owned data, restrict audit records, set optional actors null | Preserve history safely |
| Transactions | Checkout and status event with notification | Make related changes succeed or fail together |
| Indexes | Email, owner, category, status, date | Improve common queries and dashboards |

### 5.4 Why snapshots are required

Order items copy product name, SKU, image reference, purchase price, quantity, and total. Checkout orders copy the delivery address. If a vendor later changes a product or a customer updates an address, the historical order remains accurate. This is deliberate denormalization for audit correctness.

### 5.5 Migration process

Numbered SQL files under `backend/drizzle` evolve the schema. The team changes the Drizzle model, generates and reviews SQL, applies it to a Neon development branch, verifies tests and seed paths, and then promotes the same migration to the release database. Application rollback and database recovery are treated separately because reversing code does not automatically reverse stored data.

## 6 Core Workflows

### 6.1 Registration and sessions

1. React sends registration data to `POST /api/v1/auth/register`.
2. Express validates it with Zod and hashes the password using salted scrypt.
3. Customer registration creates a user. Vendor registration creates a user and pending vendor profile together.
4. The backend generates a cryptographically random session token.
5. The browser receives the token in an HTTP-only SameSite cookie; Neon stores only an HMAC digest.
6. Every protected request resolves the session, expiry, user status, role, and current vendor approval.
7. Logout deletes the stored session and clears the cookie.

### 6.2 Vendor approval

An administrator reads pending vendors and submits an approval or rejection. Approval stores the administrator and timestamp. Rejection requires a reason. Because authentication reloads the vendor profile on each request, an already signed-in vendor receives access immediately after approval without receiving administrative data.

### 6.3 Product publication

An approved vendor submits product name, unique slug, vendor-specific SKU, category, description, LKR price, publication status, stock, and threshold. Express confirms ownership and active category, converts the price to integer cents, creates product and inventory records, and records initial stock. The public catalog includes the product only when the product is published, the vendor is approved, and the category is active.

### 6.4 Cart and wishlist

Cart and wishlist data belong to the authenticated customer in Neon. Adding a cart item reloads the product and confirms publication, vendor approval, category activity, and sufficient stock. Cart totals are derived on the server. Wishlist saving is idempotent, so repeating the same save does not create duplicate relationships.

### 6.5 Simulated checkout

1. The customer submits an owned address, simulated method, and UUID idempotency key.
2. Express first checks whether the customer already used the key. A retry returns the original order.
3. The API reloads cart lines and validates product, vendor, category, and stock state.
4. The server calculates subtotal and the fixed academic LKR 350 delivery fee. Browser totals are ignored.
5. A serializable Neon transaction conditionally reduces inventory.
6. The same transaction records sale movements, checkout header, vendor child orders, item snapshots, simulated payment, initial history, customer notification, and cart clearing.
7. A stock conflict or any failure rolls back every change, so no partial order remains.

### 6.6 Multi-vendor order splitting

The customer sees one checkout reference and total. The database creates one `vendor_order` for every vendor represented in the cart. Each vendor sees and fulfils only its own child order. This protects privacy between competing vendors and allows independent fulfilment while preserving one customer checkout.

### 6.7 Fulfilment state machine

The standard path is `placed -> processing -> shipped -> delivered`. Cancellation is allowed only from defined nonterminal states and requires an explanation. The backend rejects skipped, reversed, stale, or terminal transitions. Each accepted transition stores the previous and next status, actor, note, and time, and creates a customer notification atomically.

### 6.8 Inventory audit

The inventory table contains the current available balance for fast checks. The inventory movement ledger explains every change with product, actor, movement type, signed difference, before quantity, after quantity, note, and timestamp. Initial product stock, manual adjustments, restocking, and checkout sales therefore remain traceable.

### 6.9 Reviews and complaints

A review is accepted only when the authenticated customer owns a delivered order item for the product. One customer can review a product once. It begins pending and appears publicly only after admin publication. A complaint must reference the customer's own checkout. Admins can move it from open to in review, resolved, or dismissed. A terminal action requires a resolution note and creates a customer notification.

## 7 Backend and API Design

### 7.1 Express composition

`backend/src/app.ts` creates the Express app, disables the framework signature, applies security middleware, configures credentialed CORS, limits JSON to 1 MB, exposes health and API identity routes, and mounts feature routers. Specific admin and vendor routes are mounted before broad customer routers. This order prevents customer-wide middleware from intercepting a valid vendor request.

### 7.2 Route groups

| Group | Examples | Responsibility |
|---|---|---|
| Auth | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` | Identity and session lifecycle |
| Catalog | `/categories`, `/products`, `/products/:slug` | Public discovery and public reviews |
| Cart | `/cart`, `/cart/items` | Customer cart and stock checks |
| Commerce | `/addresses`, `/checkout`, `/orders` | Addresses, transactional purchase, tracking |
| Engagement | `/wishlist`, `/notifications`, `/reviews`, `/complaints`, `/recommendations` | Saved products, events, trust, support, suggestions |
| Vendor catalog | `/vendor/products`, `/vendor/inventory` | Owned products, images, stock, movement history |
| Vendor orders | `/vendor/orders`, `/vendor/orders/:id/status` | Private fulfilment and transitions |
| Vendor insights | `/vendor/analytics`, `/vendor/ai/product-description` | Business summaries and Groq drafting |
| Admin | `/admin/vendors`, `/admin/users`, `/admin/categories`, `/admin/products`, `/admin/reviews`, `/admin/complaints` | Governance and moderation |

### 7.3 Validation and safe errors

Zod validates UUIDs, emails, password length, slugs, prices, quantities, statuses, and text lengths. Expected failures become `AppError` objects with an HTTP status, stable code, safe message, request identifier, and optional field details. Unexpected exceptions return a generic internal-server response and are logged without exposing SQL, secrets, or stack traces to the browser.

### 7.4 Ownership protection

Every private resource query includes its owner. Vendor product queries match both product and vendor profile. Vendor orders match order and vendor. Customer orders, addresses, reviews, complaints, carts, wishlists, and notifications match the authenticated customer. Knowing another UUID is therefore insufficient to access it.

### 7.5 Direct SQL and Drizzle

Drizzle handles ordinary typed queries. Parameterized SQL is used for atomic multi-step operations such as guarded checkout, fulfilment plus notification, and complaint decision plus notification. Parameters are separated from SQL text, reducing injection risk while enabling PostgreSQL common table expressions and transaction features.

## 8 Frontend Design

### 8.1 Application structure

`main.tsx` starts React, `app-router.tsx` defines routes, and `App.tsx` supplies the common shell and navigation. `AuthContext` restores the current session with `/auth/me`. `ProtectedRoute` handles signed-out users, role mismatch, pending or rejected vendors, session loading, and allowed content.

### 8.2 Main pages

| Audience | Pages | Important states |
|---|---|---|
| Public | Home, products, product detail, login, registration, not found | Loading, empty results, unavailable product, API error |
| Customer | Cart, checkout, orders, tracking, wishlist, notifications, complaints | Empty cart, stock change, success, unread events |
| Vendor | Overview, products, inventory, orders, analytics | Pending approval, form errors, low stock, no orders, AI unavailable |
| Admin | Overview, vendors, support, users, categories, products | Empty queues, validation, confirmation, state conflict |

### 8.3 API integration

The shared frontend API helper sends JSON, includes browser credentials, parses standard error responses, and centralizes the backend base URL. Typed models in catalog, cart, checkout, engagement, inventory, and analytics folders document response shapes. UI state is updated from API responses rather than assuming that a mutation succeeded.

### 8.4 Responsive design and accessibility

- Layouts change from stacked mobile views to wider catalog and dashboard grids.
- A keyboard skip link moves directly to the route's main content.
- Forms use visible labels, validation messages, disabled states, loading feedback, and success or error messages.
- Semantic main landmarks and headings communicate page structure.
- Reduced-motion preferences minimize unnecessary transitions.
- Status is not communicated only through color.
- Standalone pages and secondary dashboard routes load on demand.
- Route-level code splitting reduced initial production JavaScript from roughly 580 KB to about 302 KB.

### 8.5 Visual direction

The interface uses a forest-green and turmeric-inspired identity suitable for local produce. Consistent cards, typography, spacing, inputs, buttons, and responsive breakpoints connect the public marketplace and role workspaces while keeping each role focused on its tasks.

## 9 Smart Features and Analytics

### 9.1 Groq description assistant

An approved vendor supplies product name, category, key features, optional audience, and tone. Express creates a controlled prompt and calls Groq using the server-side API key. The prompt prohibits invented certifications, medical claims, discounts, origins, and unsupported features. The result is an editable draft; the vendor decides whether to revise and save it. Manual description entry remains available when Groq is missing or unavailable.

### 9.2 Explainable recommendations

Recommendations use a deterministic ranking strategy rather than generated text. Candidate products must be published, in stock, in an active category, and owned by an approved vendor. Wishlist categories and delivered-purchase categories provide personal affinity. Delivered sales provide a popularity fallback, and publication date provides freshness. Each recommendation includes a plain-language reason.

### 9.3 Vendor analytics

The vendor analytics endpoint calculates a rolling 30-day view from delivered orders. It returns delivered revenue, current order-status counts, daily revenue, and the five best-selling products. Every query is filtered by authenticated vendor ID. Because values come from operational order records, the dashboard can reconcile with fulfilment data.

### 9.4 Responsible AI principles

- AI assists rather than silently changing or publishing business information.
- The Groq key stays in Express and never reaches React.
- Requests are validated, bounded, and rate limited.
- Generated text remains editable and a manual fallback is always available.
- Recommendation reasons expose the ranking basis.
- Forecasting and pricing are not claimed without enough data and evaluation.

### 9.5 Deferred proposal features

Automated vendor ranking was deferred because the factors, weights, fairness tests, and appeal process require agreement. Demand forecasting and price advice require sufficient historical sales data, baselines, confidence measures, and human oversight. The learning hub was removed from scope by product decision. These are future-work items, not completed features.

## 10 Security Privacy and Ethics

### 10.1 Authentication security

- Passwords use salted scrypt; plaintext passwords are never stored.
- Session tokens are random and sent only through HTTP-only SameSite cookies.
- Neon stores an HMAC digest rather than the usable session token.
- Production cookies require HTTPS.
- Logout deletes the stored session and clears the cookie.
- Suspending an account revokes active sessions immediately.

### 10.2 API security

- Cookie-authenticated unsafe requests require the configured frontend Origin.
- Credentialed CORS allows only the configured frontend.
- Security headers restrict framing, content sniffing, referrer leakage, browser permissions, and cross-origin resources.
- Production enables HTTP Strict Transport Security.
- Authentication and Groq routes use bounded per-process rate limits.
- Request JSON is limited to 1 MB and mutations use Zod validation.
- Database queries are parameterized.
- Private responses use no-store caching and every response carries a request ID.

### 10.3 Privacy and ethics

The application follows least privilege. Vendors receive customer delivery details only for their own orders. Customers access only their own records. Administrative operations require an administrator session. Logs should contain request IDs but never cookies, passwords, database URLs, or API keys. Recommendations are explainable, AI text needs vendor review, and accessibility is treated as a responsibility rather than decoration.

### 10.4 Known security limitation

The current rate limiter is stored inside each Node.js process. It suits a single academic instance, but a horizontally scaled production deployment should enforce equivalent limits at the gateway or use a shared store such as Redis.

## 11 Testing and Release Engineering

| Quality layer | What it checks | Evidence |
|---|---|---|
| Unit and rule tests | Passwords, validation, totals, transitions, recommendations, origin rules | 33 backend tests pass |
| Static checks | Type compatibility and lint rules | Backend and frontend typechecks, frontend lint pass |
| Production builds | Server compilation and browser bundle | Express TypeScript and Vite builds pass |
| Smoke test | Health, headers, public API, anonymous boundary, optional role reads | Non-destructive `release:smoke` runner |
| Transactional E2E | Registration through support using real API and Neon | Passed with exact temporary-record cleanup |
| Manual QA | Responsive layout, keyboard flow, visual quality, configured integrations | Final device and browser pass remains release work |

### 11.1 Transactional E2E scenario

The guarded `release:e2e` runner creates uniquely tagged temporary administrator, vendor, customer, category, product, address, order, review, and complaint records. It verifies approval, publication, catalog discovery, cart, checkout, duplicate idempotency response, fulfilment, tracking, moderation, support, notifications, and logout. Cleanup runs in a `finally` block and deletes exact records in foreign-key-safe order. The runner refuses production and requires explicit mutation permission.

The live test found an Express route-mounting defect: broad customer middleware was positioned before vendor routers and returned `FORBIDDEN` before valid vendor requests reached their handler. Moving specific vendor routers before broad customer routers corrected the problem. This is strong viva evidence that integration testing catches faults unit tests cannot.

### 11.2 Environment and release controls

`release:check-env` verifies Neon and session configuration, rejects placeholder production secrets, requires HTTPS in production, and detects partially configured optional integrations without printing secrets. The smoke runner checks public behavior without changing data. Demo seeding is explicit. Real `.env` files are not committed.

### 11.3 Backup and recovery

The release documentation separates application rollback from database recovery. A logical Neon backup should be taken before significant release changes, stored securely, and restored on an isolated branch as a rehearsal. Code may be rolled back while keeping a forward-compatible schema; data restoration is a separate and carefully authorized action.

## 12 Installation and Demonstration

### 12.1 Local setup

1. In `backend`, install dependencies and copy `.env.example` to `.env`.
2. Configure `DATABASE_URL` and a random `SESSION_SECRET` of at least 32 characters.
3. Run `npm run db:migrate`, configure seed administrator values, and run `npm run db:seed`.
4. Run `npm run dev` in `backend`; the normal API URL is `http://localhost:4000`.
5. In `frontend`, install dependencies, copy its environment example, and run `npm run dev`.
6. Open `http://localhost:3000`.
7. Add Groq and Cloudinary credentials only when those optional integrations are demonstrated.

### 12.2 Recommended demonstration sequence

1. Show the public catalog, search, category filter, sorting, and product detail.
2. Register a vendor and show the pending restriction.
3. Sign in as admin and approve the vendor.
4. Return as vendor and create a product, optionally draft its description, publish it, and adjust stock.
5. Sign in as customer, save the product, add it to cart, add an address, and complete simulated checkout.
6. Open the vendor order and move it through processing, shipped, and delivered.
7. Open customer tracking and notifications, then submit a review and complaint.
8. Publish the review and resolve the complaint as admin.
9. Return to the customer notification and vendor analytics screens.

### 12.3 Demonstration safety

Use demo accounts and a Neon development branch. Never display `.env`, database URLs, session secrets, Groq keys, Cloudinary secrets, or real customer data. State clearly that payment is simulated for the academic release.

### 12.4 Limitations and future work

| Limitation | Reason | Future direction |
|---|---|---|
| Simulated payment | Academic scope avoids financial risk | Add sandbox gateway, signed webhooks, refunds, and reconciliation |
| No email verification or reset | Core marketplace flow was prioritized | Add expiring verified tokens, audit, and abuse controls |
| No vendor ranking | Factors and weights were not agreed | Co-design metrics, explanations, bias tests, and appeals |
| No forecasting or price advice | Insufficient history for reliable evaluation | Establish baselines, confidence, human review, and accuracy measures |
| English-first | Initial release scope | Add Sinhala and Tamil localization and usability testing |
| Single-process rate limit | Academic deployment assumption | Use gateway or shared-store enforcement |
| Hosting not selected | Provider decision remains open | Add provider-specific deployment, monitoring, and restore rehearsal |

## 13 Team Responsibilities

| Student | Assigned role | Main as-built viva ownership |
|---|---|---|
| Gail Breanna, CL/HDCSE/CMU/131/43 | Project Manager and Software Engineer | Planning, authentication, RBAC, users, notifications, integration, documentation, testing, release |
| Dewmini Lakshani, CL/HDCSE/CMU/131/38 | System Analyst and Database Engineer | Requirements, models, Neon and Drizzle design, integrity, categories, report data, database testing |
| Ashini Hansika, CL/HDCSE/CMU/131/46 | UI UX Engineer and Frontend Developer | Vite React UI, dashboards, responsive design, routing, API integration, accessibility, frontend quality |
| Malithi Divaki, CL/HDCSE/CMU/131/01 | Backend Software Engineer | REST API, catalog, cart, wishlist, checkout, orders, payment records, inventory, support rules |
| Thuwan Imaadh, CL/HDCSE/CMU/131/44 | AI and Business Intelligence Engineer | Groq descriptions, explainable recommendations, vendor analytics, responsible AI boundaries |

The following allocations are viva ownership areas based on the proposal and as-built project. They help each member prepare a coherent explanation; they should not be used to claim work a member did not personally perform.

## 14 Member Viva Guide Gail Breanna

**Student number:** CL/HDCSE/CMU/131/43  
**Role:** Project Manager and Software Engineer  
**Primary ownership:** Project planning, authentication, role-based access, users, notifications, integration, documentation, testing, and release.

### 14.1 Recommended opening statement

My responsibility was to coordinate the project and own the cross-cutting identity and integration layer. I can explain how users register and authenticate, how roles and vendor approval are enforced on the server, how account suspension revokes sessions, how notifications connect business events to the UI, and how the complete system was validated and prepared for release.

### 14.2 Component explanation

Authentication starts with Zod validation. Passwords are hashed with salted scrypt. After registration or login, Express generates a random session token, stores only its HMAC digest in Neon, and sets the usable token as an HTTP-only SameSite cookie. `requireAuth` resolves the current session and user. `requireRole` checks customer, vendor, or administrator. `requireApprovedVendor` adds the business-approval rule.

Customer registration creates an active customer. Vendor registration creates both the user and pending vendor profile. Administrators decide vendor approval. Because authentication reads current vendor state on protected requests, approval takes effect without changing the cookie.

User management allows administrators to suspend or reactivate non-admin accounts. Suspension deletes active sessions, so access stops immediately rather than waiting for cookie expiry. Administrator accounts are protected from this general control to reduce accidental lockout.

Notifications are persistent Neon records for checkout confirmation, order status, and complaint updates. The business change and related notification are created together where consistency matters. Integration ownership includes Express router order, common errors, request IDs, security middleware, environment validation, documentation, smoke checks, and transactional E2E.

### 14.3 Files to know

- `backend/src/auth/password.ts`
- `backend/src/auth/session.ts`
- `backend/src/auth/middleware.ts`
- `backend/src/auth/validation.ts`
- `backend/src/routes/auth.routes.ts`
- `backend/src/routes/admin.routes.ts`
- `backend/src/middleware/security.ts`
- `backend/src/app.ts`
- `backend/src/release`
- `frontend/src/auth/auth-context.tsx`
- `frontend/src/auth/protected-route.tsx`

### 14.4 Best demonstration

Register a vendor, show the pending restriction, approve it as admin, and show immediate vendor access. Attempt one forbidden role action. Update a vendor order to demonstrate a persistent customer notification. Show logout and mention the passing release checks.

### 14.5 Likely viva questions and answers

**Why enforce RBAC on the server if React hides links?**  
Browser code can be modified and API requests can be sent directly. React guards improve usability, but only Express middleware can protect data and mutations reliably.

**Why not store session tokens directly in Neon?**  
If the sessions table leaked, plaintext tokens could be replayed. Storing an HMAC digest permits lookup and revocation without storing the usable credential.

**Why use cookie sessions instead of localStorage JWTs?**  
An HTTP-only cookie is not readable by normal JavaScript, reducing token theft through an XSS bug. Server-side sessions are also easy to revoke when an account is suspended or a user logs out.

**How is CSRF risk reduced?**  
Cookies are SameSite and unsafe authenticated requests must carry the exact configured frontend Origin. Credentialed CORS also allows only that frontend.

**What happens when an account is suspended?**  
The user's status changes and active sessions are deleted. Future requests fail even if the browser still has an old cookie.

**How did you manage integration risk?**  
We built vertical slices, kept a versioned API, ran typechecks, tests, and builds, used environment validation, and completed a live disposable E2E journey.

**What did E2E testing discover?**  
It found that broad customer middleware was mounted before vendor routers and intercepted vendor requests. Reordering specific vendor routes fixed it. This shows why integrated journeys matter.

**What changes for several backend instances?**  
Session state already lives in Neon, but rate limiting must move to a shared store or gateway and logs should be centralized using request IDs.

## 15 Member Viva Guide Dewmini Lakshani

**Student number:** CL/HDCSE/CMU/131/38  
**Role:** System Analyst and Database Engineer  
**Primary ownership:** Requirements, system models, Neon PostgreSQL and Drizzle design, integrity, categories, report data, and database testing.

### 15.1 Recommended opening statement

My responsibility was to translate the marketplace requirements into a relational and auditable data model. I can explain the actors and use cases, why the as-built database uses Neon PostgreSQL rather than the proposal's MySQL wording, how tables are normalized, how keys and constraints protect integrity, and how transactions and snapshots preserve correct order history.

### 15.2 Requirements analysis

The three actors have distinct goals. Customers discover and purchase. Vendors manage owned catalog, stock, and fulfilment only after approval. Administrators govern trust and platform data. Nonfunctional requirements include security, privacy, accessibility, performance, auditability, validation, recoverability, and maintainability.

The design separates identity, catalog, shopping, ordering, and engagement. Current values such as inventory are stored separately from append-only evidence such as inventory movements. Checkout is split into a customer parent and vendor children. This directly represents the multi-vendor requirement.

### 15.3 Database explanation

The proposal mentioned MySQL, but the confirmed architecture changed to Neon PostgreSQL. This change gives managed serverless access, strong PostgreSQL transactions and constraints, and good compatibility with the Neon HTTP driver and Drizzle. The underlying relational analysis remains valid, but the viva must name the implemented database.

Important unique rules cover email, store slug, product slug, vendor SKU, customer-product review, order-item review, and checkout idempotency. Check constraints reject invalid monetary or stock values. Enumerations restrict workflow states. Foreign-key delete behavior distinguishes owned data from audit and payment records.

### 15.4 Files to know

- `backend/src/db/schema.ts`
- `backend/src/db/client.ts`
- `backend/drizzle/*.sql`
- `backend/src/db/seed.ts`
- `backend/src/db/seed-demo.ts`
- `backend/drizzle.config.ts`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DEPLOYMENT_AND_BACKUP.md`

### 15.5 Best demonstration

Use one order to explain `users -> checkout_orders -> vendor_orders -> order_items -> order_status_history` and `payments`. Then show inventory before and after checkout and the related sale movement. Explain constraints without displaying credentials or personal production data.

### 15.6 Likely viva questions and answers

**Why was PostgreSQL used instead of the proposal's MySQL?**  
The confirmed implementation adopted Neon PostgreSQL for managed serverless access, transactions, constraints, and compatibility with the selected driver and ORM. Reports must describe the as-built decision honestly.

**Why separate checkout orders and vendor orders?**  
One customer checkout can contain several vendors. The parent stores combined payment and delivery information, while each child belongs to one vendor and has an independent fulfilment state.

**Why store order-item snapshots?**  
A product can later be renamed, repriced, archived, or deleted. The snapshot preserves exactly what was purchased and paid.

**How is overselling prevented?**  
Checkout uses a serializable transaction and conditional inventory update requiring sufficient available stock. A conflict rolls back every related operation.

**What is normalization here?**  
Independent concepts such as users, vendors, categories, products, and orders are stored once and linked by keys. Join tables represent cart and wishlist collections. Snapshots are intentional exceptions for history.

**Why use integer cents for money?**  
Floating-point arithmetic can introduce rounding errors. Integer cents make totals and comparisons predictable.

**What is the difference between inventory and inventory movements?**  
Inventory is the current fast balance. Movements are the auditable explanation of how that balance changed.

**How are schema changes controlled?**  
Drizzle schema changes generate numbered SQL migrations. The migration is reviewed and tested on a development branch before the same ordered change reaches release data.

## 16 Member Viva Guide Ashini Hansika

**Student number:** CL/HDCSE/CMU/131/46  
**Role:** UI UX Engineer and Frontend Developer  
**Primary ownership:** Vite React interface, customer, vendor and admin dashboards, responsive design, API integration, accessibility, and frontend optimization.

### 16.1 Recommended opening statement

My responsibility was the user experience and React application. I can explain how public and protected routes support customer, vendor, and admin journeys; how reusable components and typed models reduce inconsistency; how forms handle loading, empty, error, and success states; and how responsive design, keyboard access, reduced motion, and lazy loading improve quality.

### 16.2 Component explanation

The frontend is an independent Vite React TypeScript single-page application. A shared shell supplies branding and navigation. React Router maps URLs to pages. `AuthContext` restores the session using `/auth/me`, and `ProtectedRoute` handles authentication, role requirements, and vendor approval states.

Customer screens emphasize discovery and a clear purchase path. Vendor screens emphasize action lists, product and stock forms, low-stock signals, fulfilment, and analytics. Administrator screens emphasize queues and safe management actions. Every remote workflow includes appropriate loading, empty, error, and success feedback.

The shared API helper includes credentials and parses the backend's safe error structure. Components never access Neon, Groq secrets, or Cloudinary secrets. Frontend types document expected response data but the backend remains authoritative.

### 16.3 Accessibility and performance

The interface includes semantic main landmarks, a keyboard skip link, associated form labels, visible state feedback, reduced-motion CSS, and responsive layouts. Standalone pages and secondary dashboard routes use dynamic imports. The analytics chart dependency loads only when visited, reducing the initial bundle from roughly 580 KB to about 302 KB.

### 16.4 Files to know

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/app-router.tsx`
- `frontend/src/index.css`
- `frontend/src/lib/api.ts`
- `frontend/src/auth`
- `frontend/src/pages`
- `frontend/src/components/ui`
- `frontend/src/catalog`, `cart`, `checkout`, `engagement`, `inventory`, and `analytics`

### 16.5 Best demonstration

Resize the catalog from desktop to mobile. Navigate by keyboard and use the skip link. Show a loading or empty state, demonstrate protected-route redirection, complete a customer action, and show that the interface updates using the real API response.

### 16.6 Likely viva questions and answers

**Why use Vite with React?**  
React provides reusable stateful interfaces, TypeScript improves contract safety, and Vite gives a fast development server and optimized build without coupling the frontend to Express.

**How does the frontend know the role?**  
`AuthContext` calls `/auth/me` using the HTTP-only cookie. The response contains safe identity and role data. `ProtectedRoute` uses it for navigation, while the backend repeats authorization.

**How was mobile usability handled?**  
Responsive grids collapse into stacked views, controls retain usable sizes, navigation adapts, and data-heavy content avoids fixed desktop-only layouts.

**What accessibility work is implemented?**  
Semantic landmarks, skip navigation, labels, keyboard operation, visible messages, reduced motion, and content that does not rely only on color.

**How are API errors shown?**  
The shared API helper parses the standard error code and message. Pages retain user input when appropriate and show clear error feedback rather than assuming success.

**Why are frontend route guards not sufficient security?**  
They can be bypassed by direct requests. They guide the user, but Express owns the real authorization decision.

**How was performance improved?**  
Dynamic imports defer secondary pages and the analytics chart. Users initially download only the common shell and current route requirements.

**What would you improve next?**  
Complete manual testing across target phones, tablets, desktop widths, keyboards, and supported browsers, then evaluate Sinhala and Tamil localization.

## 17 Member Viva Guide Malithi Divaki

**Student number:** CL/HDCSE/CMU/131/01  
**Role:** Backend Software Engineer  
**Primary ownership:** REST API, catalog, cart, wishlist, checkout, payment record, multi-vendor orders, inventory, customer data boundaries, business rules, and backend testing.

### 17.1 Recommended opening statement

My responsibility was the core marketplace business logic in Express. I can explain the versioned REST API, product ownership, stock-aware cart, server-calculated checkout, idempotency, serializable transaction, multi-vendor order split, fulfilment state machine, verified reviews, complaint ownership, and tests that protect these rules.

### 17.2 Component explanation

The backend treats every browser value as untrusted. Product writes require an approved vendor, an owned product, and an active category. Cart additions reload publication, vendor approval, category visibility, and stock. Checkout reloads the entire cart, calculates totals in integer cents, detects duplicate idempotency keys, and performs stock, order, payment, history, notification, and cart operations in one serializable transaction.

Vendor orders are always filtered by authenticated vendor profile. A central transition map defines legal states, and an atomic SQL operation writes the status, history, and customer notification. Reviews require a delivered item. Complaints require an owned checkout. Stable error codes allow React to show useful messages without revealing server details.

### 17.3 Files to know

- `backend/src/routes/catalog.routes.ts`
- `backend/src/routes/vendor-catalog.routes.ts`
- `backend/src/routes/cart.routes.ts`
- `backend/src/routes/customer-commerce.routes.ts`
- `backend/src/routes/customer-engagement.routes.ts`
- `backend/src/routes/vendor-orders.routes.ts`
- `backend/src/checkout`
- `backend/src/cart`
- `backend/src/support`

### 17.4 Best demonstration

Add a product to cart, submit checkout, and explain what happens inside the transaction. Repeat the same idempotency request to show one order. Display the inventory movement, fulfil the vendor child order step by step, and attempt an invalid state or unauthorized resource to demonstrate rejection.

### 17.5 Likely viva questions and answers

**Why calculate totals on the server?**  
A user can edit browser requests. Server calculation using current database prices and quantities prevents price and delivery-fee manipulation.

**What does idempotency solve?**  
Retries and double-clicks can repeat checkout. A unique UUID maps repeats to the original order, preventing duplicate payment and stock changes.

**Why use serializable isolation?**  
Checkout reads availability and writes many dependent records. Serializable behavior and conditional updates prevent concurrent customers from overselling the same stock.

**How are invalid order states prevented?**  
A central transition map permits only valid next states. The update checks the current database status so stale concurrent requests fail safely.

**How does one vendor avoid seeing another vendor's order?**  
The API resolves the current vendor profile and includes `vendor_id` in every selection and update. It is not merely filtered in React.

**Why store a simulated payment record?**  
It preserves the same domain boundary as a real payment and supports future gateway integration while clearly identifying the academic method and paid result.

**How are database injections prevented?**  
Drizzle and Neon tagged SQL send values as parameters rather than concatenating untrusted strings into SQL.

**How are errors made useful but safe?**  
Expected conditions have stable codes and safe messages. Unexpected errors return a generic 500 response with a request ID rather than internal SQL or stack details.

## 18 Member Viva Guide Thuwan Imaadh

**Student number:** CL/HDCSE/CMU/131/44  
**Role:** AI and Business Intelligence Engineer  
**Primary ownership:** Groq descriptions, explainable recommendations, vendor analytics, responsible AI, and evaluation boundaries.

### 18.1 Recommended opening statement

My responsibility was the implemented smart and analytical features. I can explain why Groq is used only for editable product-description drafts, how deterministic recommendations combine personal affinity, popularity, and recency, how vendor analytics reconcile with delivered orders, and why ranking, forecasting, pricing advice, and the learning hub are not claimed as complete.

### 18.2 Groq description assistant

The vendor supplies product name, category, key features, audience, and tone. Express validates these facts and builds a controlled prompt. Groq returns a draft, not an automatic publication. The prompt rejects unsupported certification, health, discount, origin, and feature claims. The vendor reviews and edits the draft. Missing credentials or service failure leaves normal manual entry available.

### 18.3 Recommendation strategy

The recommendation system first filters candidate products for publication, stock, active category, and approved vendor. It then uses wishlist and delivered-purchase category affinity as personal signals. Delivered sales offer a popularity signal for customers with little history, and recent publication adds freshness. The result includes a reason such as category interest, prior purchase pattern, popularity, or recent addition.

This is a smart ranking algorithm rather than a generative model. That is a strength for a small academic dataset because it is deterministic, explainable, testable, and inexpensive.

### 18.4 Analytics

Vendor analytics use only the authenticated vendor's delivered orders. The rolling 30-day response includes delivered revenue, status counts, daily revenue, and the five best-selling products. Values come from operational order records rather than user-editable dashboard data.

### 18.5 Files to know

- `backend/src/groq/client.ts`
- `backend/src/routes/vendor-insights.routes.ts`
- `backend/src/recommendations/strategy.ts`
- `backend/src/recommendations/strategy.test.ts`
- `frontend/src/pages/vendor-products.tsx`
- `frontend/src/pages/vendor-analytics.tsx`
- `frontend/src/pages/products-page.tsx`
- `docs/VENDOR_INSIGHTS_API.md`
- `docs/RECOMMENDATIONS_API.md`

### 18.6 Best demonstration

Generate a description from factual features and edit it before saving. Explain the manual fallback. Sign in as a customer and explain two recommendation reasons. Finish with vendor analytics and show how the chart relates to delivered orders.

### 18.7 Likely viva questions and answers

**Why use Groq?**  
It provides simple and fast hosted language-model access for the academic feature. The backend isolates the provider, so it can later be replaced without redesigning React.

**Is the recommendation system really AI?**  
It is an explainable smart ranking algorithm rather than generative AI. It is appropriate for limited data because every decision is deterministic, testable, and explainable.

**How are hallucinated claims reduced?**  
The prompt forbids unsupported certifications, health claims, discounts, origins, and features. The result remains an editable draft that a vendor must review.

**What is cold start?**  
It is the lack of personal behavior for a new customer. Smart Lanka falls back to delivered-sales popularity and recent products while continuing to show the normal catalog.

**Why are forecasting and pricing not implemented?**  
Reliable advice requires enough historical data, baselines, accuracy measures, confidence limits, and ethical evaluation. Implementing it without evidence would mislead vendors.

**Why was vendor ranking deferred?**  
Factors and weights affect business visibility and can create unfair outcomes. The system needs agreed metrics, explanations, bias checks, and an appeal or correction process.

**How is vendor privacy protected in analytics?**  
The endpoint resolves the authenticated vendor and filters every order and product aggregation by that vendor ID.

**How would you evaluate recommendations later?**  
Use offline relevance measures and online engagement or conversion comparisons, while monitoring diversity, popularity bias, availability, and whether explanations match the scoring basis.

## 19 Shared Viva Question Bank

### 19.1 Give a one-minute explanation of Smart Lanka

Smart Lanka is a responsive role-based multi-vendor marketplace for Sri Lankan local producers and SMEs. Customers discover and buy products, approved vendors manage catalog, stock and fulfilment, and administrators govern vendors, users, content and support. React supplies the interface, Express enforces business rules, Neon PostgreSQL stores auditable data, Groq assists description writing, and Cloudinary manages product images.

### 19.2 What is the main technical achievement

The strongest achievement is the complete transactional journey: role approval, stock-aware cart, idempotent serializable checkout, vendor order splitting, audited fulfilment, notifications, verified reviews, and complaint moderation, all protected by server-side ownership rules.

### 19.3 Why are there two projects in one repository

One repository coordinates compatible versions, changes, and documentation. Separate frontend and backend projects preserve independent dependencies, environment files, builds, deployment, and security boundaries. There is no root npm workspace.

### 19.4 Why does React not connect directly to Neon

Direct access would expose credentials and allow users to bypass authorization, validation, ownership, and transactional rules. Express is the trusted boundary for all database and external-service access.

### 19.5 Which architectural patterns are visible

The project uses layered architecture and feature-based modules. Middleware handles cross-cutting concerns, routers act as controllers, Zod schemas validate inputs, calculation and state modules contain pure rules, and Drizzle or SQL implements persistence.

### 19.6 How does the system ensure consistency

Database constraints reject invalid records. Ownership is included in queries. Checkout uses serializable all-or-nothing transaction logic. Status transitions verify the current state. Payment and item snapshots preserve history. Notifications are created with the event they describe.

### 19.7 How can the system scale

React and Express deploy separately. The backend can remain stateless because sessions and business data are in Neon. Feature routers can evolve independently. A real multi-instance deployment still needs shared rate limiting, centralized logs, monitoring, and carefully selected hosting.

### 19.8 What is novel about the project

The novelty is not one isolated algorithm. It is the combination of an SME-focused multi-vendor workflow, explainable recommendations, safe editable AI content assistance, vendor analytics, auditable inventory, and role-specific governance in one coherent application.

### 19.9 What would be improved first

Complete device and accessibility QA, select hosting, perform a real restore drill, add email verification and password reset, then integrate a sandbox payment gateway with signed webhooks, refunds, and reconciliation.

### 19.10 How does the project support SMEs

It lowers the digital barrier through guided product and inventory tools, direct customer discovery, independent fulfilment, sales analytics, and editable AI-assisted descriptions.

### 19.11 What ethical issues were considered

The system limits data by role, protects credentials, uses explainable recommendations, retains human control over AI text, avoids unsupported advanced-AI claims, and treats accessibility and future localization as responsibilities.

### 19.12 How should a member answer an unfamiliar question

State the requirement, identify the relevant layer, explain the data flow, name one validation or security control, mention test evidence, and finish with a limitation or improvement. Do not guess. It is acceptable to say that a feature was intentionally deferred and explain the engineering reason.

## 20 Viva Answer Method

1. Start with the user or business need.
2. Identify your component and its place in the architecture.
3. Explain the request and data flow in sequence.
4. Name a validation, security, privacy, or integrity control.
5. Mention the evidence used to test it.
6. End with one honest limitation or future improvement.

Example: When checkout is submitted, Express reloads the cart, calculates totals in integer cents, checks stock, and runs a serializable Neon transaction. The UUID idempotency key prevents duplicate orders. We verified this through the disposable E2E scenario. The academic payment is simulated, so a production version would add signed gateway webhooks and reconciliation.

## 21 Glossary

| Term | Meaning in Smart Lanka |
|---|---|
| API | Versioned JSON interface used by React to request backend operations |
| Authentication | Proving identity through email, password, and a valid session |
| Authorization | Deciding whether that identity may perform an action on a resource |
| RBAC | Role-based access control for customer, vendor, and administrator |
| Idempotency | A repeated checkout key returns the original order without repeating effects |
| Transaction | Database operations that commit or roll back together |
| Serializable isolation | Strong concurrency behavior making competing transactions act safely in sequence |
| ORM | Drizzle maps TypeScript schema and queries to relational operations |
| Migration | Versioned SQL change evolving the database predictably |
| Snapshot | Purchase-time data preserved even when source data changes |
| HMAC | Keyed digest allowing Neon to store no usable session token |
| CSRF | Cross-site write attack reduced by SameSite cookies and Origin checks |
| CORS | Browser policy permitting credentialed API access only from the configured frontend |
| E2E | End-to-end test across real API, roles, business logic, and database |
| Cold start | Recommendation behavior when a user has little personal history |
| Explainability | Human-readable reason for a recommendation or automated result |

## 22 Source and Code Map

| Area | Primary reference |
|---|---|
| Proposal and team allocation | `dev final.docx` |
| Assessment expectations | `icbthdcse5015t1sriwrit1.docx` |
| Architecture and status | `README.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DECISIONS.md` |
| Database | `backend/src/db/schema.ts`, `backend/drizzle` |
| Backend | `backend/src/app.ts`, `backend/src/routes`, `backend/src/auth`, `backend/src/checkout` |
| Frontend | `frontend/src/app-router.tsx`, `frontend/src/auth`, `frontend/src/pages` |
| Feature contracts | API documents under `docs` |
| Security and release | `docs/SECURITY_AND_RELEASE.md`, `docs/TRANSACTIONAL_E2E.md`, `docs/DEPLOYMENT_AND_BACKUP.md` |

## 23 Final Project Position

Smart Lanka demonstrates a coherent end-to-end marketplace rather than unrelated screens. Its strongest qualities are server-enforced roles and ownership, auditable inventory and fulfilment, idempotent transactional checkout, honest assistive AI, explainable recommendations, and tested separation between React and Express. The academic release is ready to demonstrate within its implemented scope. Production hosting, live payment, restore rehearsal, identity recovery, localization, and data-intensive intelligence remain documented next steps.
