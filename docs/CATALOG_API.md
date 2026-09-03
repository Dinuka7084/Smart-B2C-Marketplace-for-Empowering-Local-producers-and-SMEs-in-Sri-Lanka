# Catalog API

All routes use the `/api/v1` prefix. Public catalog routes require no session. Vendor routes require an authenticated, approved vendor and enforce product ownership on the server.

## Public routes

- `GET /categories` returns active categories.
- `GET /products` returns published products from approved vendors. Query parameters: `q`, `category`, `sort` (`newest`, `price-asc`, `price-desc`), `page`, and `pageSize`.
- `GET /products/:slug` returns one published product with its category, approved vendor, and current availability.

## Vendor routes

- `GET /vendor/products` lists the signed-in vendor's products and inventory.
- `POST /vendor/products` creates a product and its initial inventory atomically.
- `PATCH /vendor/products/:productId` updates owned product metadata.
- `PATCH /vendor/products/:productId/inventory` updates available stock and the optional low-stock threshold.
- `POST /vendor/products/:productId/image-upload-signature` issues a short-lived signed Cloudinary upload payload after checking vendor ownership.
- `PATCH /vendor/products/:productId/image` saves the resulting secure Cloudinary URL and public ID after validating its account and vendor folder.

Prices cross the API as decimal LKR (`priceLkr`) and are stored as integer cents (`priceCents`). Public catalog results include only products whose status is `published`, category is active, and vendor is approved.

## Local demo setup

Add `DATABASE_URL` and `SESSION_SECRET` to `backend/.env`, then run from `backend/`:

```bash
npm run db:migrate
npm run db:seed
```

The seed creates the default categories. Product creation is available after an administrator approves a registered vendor.

For product images, also fill `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `backend/.env`. The secret is used only by Express and is never returned to the browser.
