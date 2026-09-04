# Security and release controls

## Implemented controls

- Session tokens are random, stored only as HMAC digests in Neon, and delivered through HTTP-only, SameSite cookies. Production cookies require HTTPS.
- Unsafe requests carrying a session cookie require the configured `FRONTEND_URL` origin. Cross-site browser writes are rejected with `UNTRUSTED_ORIGIN`.
- The API sends `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Resource-Policy`. Production enables one-year HSTS.
- Authenticated and authentication responses use `Cache-Control: private, no-store`.
- Every API response receives an `X-Request-Id`; JSON errors include the same identifier for support tracing.
- Registration and login share a limit of 10 attempts per IP per 15 minutes. Groq description drafting allows 5 requests per IP per minute.
- Request JSON is limited to 1 MB. Product images use signed direct Cloudinary uploads with server-side ownership verification.
- Role, vendor approval, and resource ownership checks remain server-side for every protected operation.

## Accessibility and performance baseline

- Every route exposes a keyboard skip link and a focusable main-content target.
- Reduced-motion preferences minimize transitions and animations.
- Route loading messages are announced politely.
- Standalone pages and secondary dashboard views are code-split. Analytics and its chart library load only when requested.

## Deployment requirements

- Set `NODE_ENV=production`, use HTTPS, and configure `FRONTEND_URL` to the exact public frontend origin.
- Store `DATABASE_URL`, `SESSION_SECRET`, `GROQ_API_KEY`, and Cloudinary credentials in the hosting platform's secret manager.
- Use a new random `SESSION_SECRET` of at least 32 characters; never reuse the example value.
- The current rate limiter is per Node.js process. A multi-instance production deployment should enforce equivalent limits at its gateway or replace it with a shared store.
- Forward application logs with request identifiers to the selected logging platform without recording session cookies, passwords, database URLs, or API keys.
- Run backend tests/build, frontend build/lint, database migrations, critical end-to-end tests, and dependency audits before release.
- Run the guarded transactional journey only against a Neon development/staging branch. It requires `E2E_ALLOW_DATABASE_MUTATION=true`, refuses production mode, and cleans its exact temporary records; see `TRANSACTIONAL_E2E.md`.

## Remaining release work

- Hosting-specific deployment configuration after a provider is selected.
- A real Neon restore drill, final responsive/accessibility testing, and a successful dependency audit when the npm registry is available.
