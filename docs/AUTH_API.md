# Smart Lanka authentication API

Base URL in local development: `http://localhost:4000/api/v1`

All successful login and registration responses set the HTTP-only `smart_lanka_session` cookie. Browser requests from the frontend must include credentials.

## Public endpoints

### `POST /auth/register`

Customer body:

```json
{
  "email": "customer@example.com",
  "password": "a-password-with-at-least-12-characters",
  "firstName": "Nimali",
  "lastName": "Perera",
  "role": "customer"
}
```

Vendor body adds `businessName`, a unique lowercase `storeSlug`, and may include `registrationNumber`, `phone`, and `description`. Vendor registration always starts with `vendorApprovalStatus: "pending"`. Public registration cannot create administrators.

### `POST /auth/login`

```json
{
  "email": "customer@example.com",
  "password": "a-password-with-at-least-12-characters"
}
```

### `POST /auth/logout`

Deletes the current server-side session when present and clears the cookie.

## Authenticated endpoint

### `GET /auth/me`

Returns the safe user identity, role, and vendor approval state for the current session.

## Administrator endpoints

### `GET /admin/vendors/pending`

Lists pending vendor applications in submission order.

### `PATCH /admin/vendors/:vendorUserId/approval`

Approve:

```json
{ "status": "approved" }
```

Reject:

```json
{
  "status": "rejected",
  "reason": "Registration details could not be verified."
}
```

Approval records the administrator and timestamp. Rejection requires a reason.
