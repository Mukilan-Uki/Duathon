# Stage 7 Security Review

Review date: 2026-08-01

## Checks completed

- Authentication and refresh-token rotation routes reviewed.
- Customer, employee, administrator, family and guardian authorization boundaries reviewed.
- Financial mutations checked for backend ownership validation and integer minor units.
- Family and junior financial actions checked for reuse of the transactional transfer service.
- Trusted-device tokens checked for HTTP-only cookie storage and HMAC-only database storage.
- Device trust removal and logout-all checked for password confirmation, origin enforcement, rate limiting and session revocation.
- Source scanned for committed environment files, private keys, production connection strings, debug logging, `eval`, and unsafe HTML injection.
- Dependency audit, lint, automated tests and production build executed.

## Finding resolved

Security-sensitive device trust, trust removal and logout-all actions now have a dedicated limit of 10 attempts per 15 minutes in addition to password confirmation and trusted-origin validation.

The transitive `brace-expansion` denial-of-service advisory was resolved by updating the lockfile.

## Dependency advisory requiring monitoring

`npm audit` reports two high-severity findings against React Router 7.18.2 for an RSC action-processing CSRF bypass. This project is a Vite client-side SPA and does not use React Server Components, framework actions, server actions, or React Router's RSC request handlers, so the vulnerable execution path is not deployed. Downgrading to 7.11.0 was tested during review but exposed a larger collection of router advisories. The project remains on 7.18.2 and must upgrade when a patched upstream release is available.

This is an accepted prototype risk, not a claim that the dependency tree has zero advisories.

## Known limitations

- Trusted-device confirmation uses the current password; optional 2FA enrollment is not implemented.
- IP risk signals do not perform geolocation or impossible-travel analysis.
- Automated tests use mocked service boundaries and do not replace staging tests against a MongoDB replica set.
- External penetration testing, KYC verification, PCI assessment and bank-grade certification are outside this prototype.
