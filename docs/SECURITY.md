# Security

Phase 1 enables Helmet, explicit-origin CORS, API rate limiting, request-size limits, NoSQL injection sanitization, HTTP parameter-pollution protection, environment validation, and production-safe error output.

Secrets belong only in deployment settings or ignored `.env` files.

Authentication uses bcrypt cost 12, short-lived JWT access tokens, signed JWT refresh-token rotation, SHA-256 refresh-token hashes, HttpOnly cookies, account lockout, login rate limiting, role authorization, generic recovery responses, and HMAC-hashed OTPs with expiration and attempt limits. Password changes revoke active refresh sessions.

Cookie-backed refresh and logout requests enforce the configured frontend origin. Production startup rejects development JWT secrets. The SMTP transport disables file and URL access.

Account numbers and balances are backend-controlled. Customers can only read accounts they own. Staff account decisions use role checks, validated state transitions, and immutable audit records containing actor, target, IP address, user agent, and before/after values.

Transfers never accept a frontend balance. The service validates account ownership and status, receiver status, currency, limits, and safe integer amounts. A conditional debit prevents concurrent overspending. Debit, credit, both financial records, and audit logging share one MongoDB transaction. Idempotency keys prevent duplicate money movement, and completed financial records have no physical-delete endpoint.

Beneficiary account identity comes from the database rather than client-provided names. Customers cannot save their own accounts or remove another customer’s beneficiary. Selecting a beneficiary only fills the transfer form; the transfer service independently revalidates the destination account.

Loan rates and limits come from trusted server configuration. Customers cannot select an interest rate or change calculated repayment values. Approval/disbursement and loan payments use MongoDB transactions, conditional balance updates, immutable financial records, resource ownership checks, role authorization, audit logs, and payment idempotency.

Dashboard APIs enforce role authorization independently of the client routes. Customer queries are scoped to the authenticated user, bank-wide analytics require the administrator role, and all dashboard operations are read-only. High-value activity is an operational attention list based on the configured transfer limit; it is not represented as automated fraud detection.

Notification ownership is enforced on every read update. Investigation access requires an employee or administrator role, while audit logs and system settings require an administrator. Audit-log mutation middleware prevents normal update and delete operations. Settings use a fixed key allow-list and strict value types, and every settings or investigation change records actor, target, network metadata, and before/after state.

The centralized error handler classifies malformed JSON, Mongoose cast and validation errors, duplicate keys, and operational errors without exposing unexpected exception details. Stack traces are restricted to development. The Phase 9 dependency review found `GHSA-qwww-vcr4-c8h2`; its affected unstable React Server Component path is not used by this declarative-mode Vite SPA. The assessment and upgrade guidance are recorded in `QUALITY.md`.

Audit snapshots are recursively redacted for password, token, OTP, secret, cookie, and authorization
keys. Notification reads, updates, and soft deletion are scoped to the authenticated recipient.
Administrative broadcasts and governance APIs require the administrator role. Automated risk
signals cover authentication abuse, OTP abuse, password-reset bursts, large transfers, and repeated
transfer failures without storing credentials or security codes.

In local development without SMTP, security codes are written to the server console so the flow can be tested. Production never logs codes and must configure SMTP.

## Dependency audit note

React Router 7.18.2 resolves the general client-routing advisories reported for earlier releases. npm currently reports one remaining high advisory for React Server Components mode. This application is a client-only Vite SPA and does not enable React Server Components, so the vulnerable code path is not used. Recheck this advisory during every dependency update.

## Family, junior and trusted-device controls

Family roles and every sharing permission are stored and enforced by services. Adult balances are never implicitly shared. Goal contributions use integer minor units, source-account ownership checks, transactions and idempotency.

Junior accounts carry a backend restriction marker. Direct normal transfers are rejected and supervised transfers revalidate limits and approval state before calling the existing transfer service. Guardians receive only explicitly granted controls; adult conversion is restricted to staff and revokes obsolete sessions.

Trusted-device cookies contain random server-generated tokens and are HTTP-only, Secure in production and SameSite-restricted. MongoDB stores only an HMAC-SHA-256 digest. Trust and destructive session actions require password confirmation; cookie-backed mutations enforce the trusted origin and sensitive confirmation routes are rate-limited. Device labels and user agents are never identity proof.

The project is not certified as production bank-grade. See [SECURITY_REVIEW.md](SECURITY_REVIEW.md), [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) and [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md).
