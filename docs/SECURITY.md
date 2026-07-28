# Security

Phase 1 enables Helmet, explicit-origin CORS, API rate limiting, request-size limits, NoSQL injection sanitization, HTTP parameter-pollution protection, environment validation, and production-safe error output.

Secrets belong only in deployment settings or ignored `.env` files.

Authentication uses bcrypt cost 12, short-lived JWT access tokens, signed JWT refresh-token rotation, SHA-256 refresh-token hashes, HttpOnly cookies, account lockout, login rate limiting, role authorization, generic recovery responses, and HMAC-hashed OTPs with expiration and attempt limits. Password changes revoke active refresh sessions.

Cookie-backed refresh and logout requests enforce the configured frontend origin. Production startup rejects development JWT secrets. The SMTP transport disables file and URL access.

Account numbers and balances are backend-controlled. Customers can only read accounts they own. Staff account decisions use role checks, validated state transitions, and immutable audit records containing actor, target, IP address, user agent, and before/after values.

In local development without SMTP, security codes are written to the server console so the flow can be tested. Production never logs codes and must configure SMTP.

## Dependency audit note

React Router 7.18.1 resolves the general client-routing advisories reported for earlier releases. npm currently reports one remaining high advisory for React Server Components mode. This application is a client-only Vite SPA and does not enable React Server Components, so the vulnerable code path is not used. Recheck this advisory during every dependency update.
