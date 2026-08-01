# Testing

## Commands

```bash
npm test
npm run lint
npm run format:check
npm run build
npm audit
```

The client uses Vitest and Testing Library. The server uses Vitest and Supertest with mocked service boundaries for API authorization/validation tests and focused service/model tests.

The latest deployment-preparation run executed 122 automated tests: 7 client and 115 server tests. Lint and the Vite production build passed. See [TEST_MATRIX.md](TEST_MATRIX.md) and [SECURITY_REVIEW.md](SECURITY_REVIEW.md).

`npm audit` still reports an RSC-only React Router advisory. The deployed architecture is a client-only Vite SPA and does not use RSC/server actions; the accepted prototype risk and upgrade requirement are documented in the security review.

## Manual staging checklist

Use development-only accounts and test funds. Verify registration, email delivery, password recovery, each dashboard, account approval, transfer and safe retry, beneficiaries, loans, notifications, family invitations/goals, junior limits/allowances/approvals, trusted-device actions, ownership denial, staff role denial, mobile layouts, cross-origin cookies, CORS and refresh-on-route behavior.

Financial integration tests require MongoDB transactions, so use a replica set or Atlas. Never point tests or seeds at production.
