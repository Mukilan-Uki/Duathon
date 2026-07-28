# Duothan Banking Platform

A secure digital-banking platform rebuilt for Duothan 6.0 – Phase 02. This monorepo contains a React client and an Express/MongoDB API. Phase 1 establishes project tooling, health monitoring, security middleware, responsive routing, and documentation.

Phase 2 adds customer registration, email verification, login/logout, protected routes, refresh-token rotation, role authorization, password recovery, account lockout, and login history.

Phase 3 adds Savings and Current account applications, backend-generated account numbers, customer account views, staff approval, status management, and immutable decision audit records.

Phase 4 adds MongoDB-transaction-backed transfers, idempotency protection, linked sender/receiver records, configurable limits, searchable transaction history, details, and printable receipts.

Phase 5 adds validated saved beneficiaries, owner-scoped removal, beneficiary management UI, and transfer-form integration.

Phase 6 adds loan applications, staff review decisions, atomic approval/disbursement, integer repayment calculations, idempotent transactional loan payments, and customer/staff loan interfaces.

## Quick start

Requirements: Node.js 20+, npm 10+, and optionally a MongoDB Atlas connection string.

```bash
npm install
copy server\.env.example server\.env
copy client\.env.example client\.env
npm run dev
```

On macOS/Linux use `cp` instead of `copy`. Open `http://localhost:5173`; the API health endpoint is `http://localhost:5000/api/health`. Add `MONGODB_URI` to `server/.env` for MongoDB. Never commit `.env` files.

## Commands

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run build
npm run lint
npm run format:check
npm test
```

## Repository and documentation

- `client/` – React application
- `server/` – Express API
- `docs/` – [API](docs/API.md), [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), and [user guide](docs/USER_GUIDE.md)

Deploy `client/` to Netlify with `npm run build` and `dist`. Deploy `server/` to Render with `npm start`. Configure variables from each `.env.example` in the provider. Screenshots will be added after deployment.
