# Smart Lanka

Smart Lanka is a B2C marketplace for Sri Lankan local producers and SMEs. The repository contains two completely independent Node.js projects.

## Structure

```text
frontend/   Vite/React customer, vendor, and administrator SPA
backend/    Express.js HTTP API, Neon PostgreSQL, authentication, Groq, and Cloudinary
docs/       Product plan and architecture decisions
```

The Vite frontend never connects directly to Neon or external services. It communicates with the Express backend over `/api/v1`; the backend owns authorization, validation, business rules, and credentials.

## Local development

Install and start the frontend from one terminal:

```bash
cd frontend
npm install
npm run dev
```

Install and start the backend from a second terminal:

```bash
cd backend
npm install
npm run dev
```

Copy each project's `.env.example` to `.env` before enabling its configured services. Each folder has its own `package.json`, lockfile, dependencies, commands, and build output. There is intentionally no root npm project.

## Database and authentication setup

After adding a Neon connection string and a random session secret to `backend/.env`:

1. From the `backend` folder, run `npm run db:migrate` to apply the committed SQL migrations.
2. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `backend/.env`.
3. Run `npm run db:seed` to create or update the administrator account.

Customer and vendor registration is available at `POST /api/v1/auth/register`. Vendor accounts begin in the `pending` state. An authenticated administrator can review them with `GET /api/v1/admin/vendors/pending` and decide with `PATCH /api/v1/admin/vendors/:vendorUserId/approval`.

Authentication uses an HTTP-only session cookie. The usable token is never stored in the database; Neon stores an HMAC digest and expiry instead.

## Validation

Run commands inside the relevant project folder:

- Frontend: `npm run build`, `npm run typecheck`, and `npm run lint`.
- Backend: `npm run build`, `npm run typecheck`, and `npm test`.
- Backend database: `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed`.
