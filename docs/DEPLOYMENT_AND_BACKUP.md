# Deployment and Neon recovery runbook

Smart Lanka deploys as two independent projects. The Vite frontend is a static build, while the Express backend requires a Node.js 22+ service with outbound HTTPS access to Neon, Groq, and Cloudinary.

## Deployment contract

Frontend configuration:

- Set `VITE_API_URL` to the public backend URL ending in `/api/v1` before running `npm run build`.
- Publish only the generated `frontend/dist` directory.
- Configure SPA fallback routing to `index.html` so direct links such as `/vendor/analytics` work.

Backend configuration:

- Build with `npm run build` and start with `npm start`.
- Set `NODE_ENV=production` and the exact HTTPS frontend origin in `FRONTEND_URL`.
- Store Neon, session, Groq, Cloudinary, seed, and smoke credentials in the hosting platform's secret manager—not source control or build logs.
- Configure the service health check as `GET /health`.

## Release order

1. Back up the current database and record the application revision.
2. Run backend and frontend builds, tests, lint, environment validation, dependency audit, and the smoke runner in staging.
3. Review every unapplied SQL migration and run `npm run db:migrate` once against the target Neon database.
4. Deploy the backend and verify `/health`, `/api/v1`, the public catalog, and authenticated role reads.
5. Build and deploy the frontend with the final backend URL.
6. Run the smoke runner against the public URLs, then manually verify one critical customer and vendor journey.

Do not run the demo seed in production. Do not automatically reverse an applied schema migration during application rollback; deploy a compatible previous application revision or append a reviewed corrective migration.

## Logical backup

Use PostgreSQL client tools compatible with the Neon PostgreSQL version. Keep connection strings out of shell history where possible.

```bash
pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="smart-lanka-YYYY-MM-DD.dump"
```

Encrypt backups at rest, restrict access, retain more than one recovery point, and store a copy outside the deployment account. Confirm the selected Neon plan's built-in restore window separately; a provider snapshot does not replace a tested logical export.

## Restore verification

Never test restoration over the active production database. Create an empty recovery database or isolated Neon branch, then run:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$RECOVERY_DATABASE_URL" "smart-lanka-YYYY-MM-DD.dump"
```

After restoration:

1. Run all committed migrations against the recovery database.
2. Start a staging backend using the recovery connection string.
3. Run `release:smoke` and verify representative users, products, inventory, orders, reviews, complaints, and audit histories.
4. Record the backup timestamp, restore duration, missing data interval, result, and operator.
5. Delete the isolated recovery environment only after the result is documented.

Perform a restore drill before the first production launch and periodically thereafter. Production recovery should follow the same tested sequence, with writes paused before cutover and DNS/service configuration changed only after validation.
