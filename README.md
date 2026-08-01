# Duothan Banking Platform

A secure full-stack digital banking platform built for **Duothan 6.0 – Phase 02: REBUILD**. The project demonstrates customer banking, employee operations, administrator governance, transactional financial processing, layered security, testing, and production deployment in a JavaScript monorepo.

## Features

### Customer

- Registration, email verification, secure login, refresh-token rotation, logout, and password recovery
- Savings and Current account applications
- Available balances and account-status tracking
- Transactional account-to-account transfers with idempotency protection
- Searchable and paginated transaction history with printable receipts
- Saved beneficiaries
- Loan applications, status tracking, repayment schedules, and idempotent payments
- Dashboard analytics, notifications, login history, and notification preferences
- Family Banking with explicit member permissions, invitations, announcements, and shared goals
- Supervised Junior Banking with allowances, spending limits, approvals, and personal goals
- Trusted-device review, trust removal, risk-aware login history, and remote session logout

### Employee

- Operational dashboard and assigned-customer totals
- Account and loan application review
- Account activation and suspension
- Transaction monitoring, suspicious-activity flags, and investigation notes
- Historical loan decisions without deleting financial records

### Administrator

- Bank-wide dashboard analytics
- Account and loan operational access
- Suspicious-activity monitoring
- Immutable audit-log browser
- Validated and audited transaction, loan, account, and security settings

## Technology

- **Client:** React 19, Vite, React Router, Axios, Tailwind CSS, Recharts, React Hook Form, Zod
- **Server:** Node.js, Express, Mongoose, JWT, bcrypt, Helmet, CORS, rate limiting
- **Database:** MongoDB Atlas with transactions for financial operations
- **Quality:** ESLint, Prettier, Vitest, Testing Library, Supertest
- **Deployment:** Netlify client, Render API, MongoDB Atlas

## Quick start

Requirements: Node.js 20+, npm 10+, and a MongoDB deployment that supports transactions.

```bash
npm install
copy server\.env.example server\.env
copy client\.env.example client\.env
npm run dev
```

On macOS or Linux, use `cp` instead of `copy`. Set a valid `MONGODB_URI` in `server/.env`, then open `http://localhost:5173`. The API health endpoint is `http://localhost:5000/api/health`.

Never commit `.env` files or real credentials.

## Demo data

Demo seeding is intentionally blocked in production and requires an explicit password:

```bash
# Add DEMO_SEED_PASSWORD with at least 12 characters to server/.env
npm run seed:demo
```

The idempotent seed creates an administrator, employee, two adult customers, a junior customer, active accounts, family and junior banking fixtures, a loan application, trusted-device examples, notifications, audit data, and sample transactions. See [Development demo credentials](docs/DEMO_CREDENTIALS.md). Use demo data only in local or dedicated test databases.

## Commands

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run build
npm run lint
npm run format:check
npm test
npm run seed:demo
npm run preflight:deploy
npm run package:submission
```

## Project layout

```text
client/                 React application
  src/components/       Shared UI and banking components
  src/pages/            Role-specific pages
  src/services/         API clients
server/
  src/controllers/      HTTP request orchestration
  src/middleware/       Authentication, validation, and error handling
  src/models/           Mongoose schemas
  src/routes/           REST routes
  src/services/         Banking and financial business logic
  src/scripts/          Controlled operational scripts
  src/tests/            API and unit tests
docs/                   API, architecture, security, quality, and user guides
```

## Documentation

- [API reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [Quality assurance](docs/QUALITY.md)
- [User guide](docs/USER_GUIDE.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Enterprise operations](docs/ENTERPRISE.md)
- [Final submission checklist](docs/SUBMISSION_CHECKLIST.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Testing](docs/TESTING.md)
- [Disaster recovery](docs/DISASTER_RECOVERY.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Release notes](docs/RELEASE_NOTES.md)
- [Development demo credentials](docs/DEMO_CREDENTIALS.md)
- [Submission handoff](docs/SUBMISSION.md)

## Screenshots

Add final deployed screenshots to `docs/screenshots/` before submission:

- Public home and authentication
- Customer dashboard and transfer confirmation
- Employee review and monitoring
- Administrator dashboard and audit controls
- Responsive mobile dashboard

Do not capture real customer information, access tokens, OTPs, or credentials.

## Deployment

The repository includes `netlify.toml` and `render.yaml`. Follow the [deployment guide](docs/DEPLOYMENT.md) to configure provider variables, Atlas access, CORS, health checks, and post-deployment verification.

Deployment URLs are intentionally left blank until the owner completes and verifies deployment:

- Frontend: _not deployed/verified in this workspace_
- Backend: _not deployed/verified in this workspace_
- Repository: <https://github.com/Mukilan-Uki/Duathon>

## Problem and solution

Many prototype banking systems demonstrate screens without enforcing ownership, transactional money movement, or role separation. Duothan provides a layered reference implementation where authorization and financial rules live on the server, financial writes use MongoDB transactions and idempotency, and family/junior access never implies unrestricted access to another adult's money.

## Team

Team names and student identifiers are intentionally not stored in this public repository. Provide them directly in the official submission form if required.

## License

Licensed under the MIT License. See [LICENSE](LICENSE).

## Known limitations

This is an educational prototype, not a certified bank or PCI-compliant production service. See [Known limitations](docs/KNOWN_LIMITATIONS.md).
