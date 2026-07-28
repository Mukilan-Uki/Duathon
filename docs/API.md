# API Documentation

Base URL: `/api`

`GET /health` is public and reports API availability, database connection state, process uptime, and timestamp. Successful responses use `{ "success": true, "message": "...", "data": {} }`. Errors use `{ "success": false, "message": "...", "errors": [] }`.

## Authentication

| Method | Endpoint                    | Access          | Purpose                             |
| ------ | --------------------------- | --------------- | ----------------------------------- |
| POST   | `/auth/register`            | Public          | Register a customer                 |
| POST   | `/auth/verify-email`        | Public          | Verify a six-digit email code       |
| POST   | `/auth/resend-verification` | Public, limited | Request another verification code   |
| POST   | `/auth/login`               | Public, limited | Sign in and receive an access token |
| POST   | `/auth/refresh`             | Refresh cookie  | Rotate the refresh token            |
| POST   | `/auth/logout`              | Public          | Revoke the refresh session          |
| POST   | `/auth/forgot-password`     | Public, limited | Request a reset code                |
| POST   | `/auth/reset-password`      | Public, limited | Reset using the code                |
| GET    | `/auth/me`                  | Bearer token    | Fetch the authenticated user        |
| GET    | `/auth/login-history`       | Bearer token    | Fetch the latest 20 login events    |
| PATCH  | `/auth/change-password`     | Bearer token    | Change password and revoke sessions |
| GET    | `/auth/admin-check`         | Admin only      | Demonstrate role enforcement        |

The access token is held in client memory. The signed refresh token is only stored in an HttpOnly cookie and only its hash is persisted.

## Accounts

All account endpoints require a Bearer access token.

| Method | Endpoint                      | Role            | Purpose                                         |
| ------ | ----------------------------- | --------------- | ----------------------------------------------- |
| POST   | `/accounts`                   | Customer        | Submit a Savings or Current account application |
| GET    | `/accounts/me`                | Customer        | List the authenticated customer’s accounts      |
| GET    | `/accounts/:accountId`        | Owner or staff  | View an authorized account                      |
| GET    | `/accounts/pending`           | Employee, admin | List pending applications                       |
| PATCH  | `/accounts/:accountId/review` | Employee, admin | Approve or reject a pending account             |
| PATCH  | `/accounts/:accountId/status` | Employee, admin | Activate or suspend; only admin may close       |

Account numbers and balances are never accepted from the client. Balance values use integer LKR minor units.
