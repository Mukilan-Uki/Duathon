# Security

Phase 1 enables Helmet, explicit-origin CORS, API rate limiting, request-size limits, NoSQL injection sanitization, HTTP parameter-pollution protection, environment validation, and production-safe error output.

Secrets belong only in deployment settings or ignored `.env` files. Authentication packages are installed as the Phase 2 foundation; authentication is not claimed as implemented yet. Future refresh tokens will be rotated and stored securely, passwords hashed with bcrypt, and resource-level authorization applied.

## Dependency audit note

React Router 7.18.1 resolves the general client-routing advisories reported for earlier releases. npm currently reports one remaining high advisory for React Server Components mode. This application is a client-only Vite SPA and does not enable React Server Components, so the vulnerable code path is not used. Recheck this advisory during every dependency update.
