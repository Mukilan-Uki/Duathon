# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Duothan Banking Platform — a full-stack digital banking prototype (npm-workspace monorepo: `client` React SPA + `server` Express API + MongoDB). Built for a hackathon ("Duothan 6.0 – Phase 02: REBUILD"). Educational prototype, not a certified/PCI-compliant bank.

## Commands

```bash
npm run dev              # client (5173) + server (5000) concurrently
npm run dev:client       # or dev:server
npm run build            # vite build of client only
npm run lint             # eslint both workspaces, --max-warnings 0
npm test                 # vitest run in both workspaces
npm run format:check     # prettier (write with npm run format)
npm run seed:demo        # requires DEMO_SEED_PASSWORD (12+ chars); blocked in production
npm run preflight:deploy
npm run package:submission
```

Single test / focused runs (there is no `vitest.config.js` on the server — config lives in `client/vite.config.js` for the client, defaults for the server):

```bash
npm test -w server -- src/tests/transactionApi.test.js
npm test -w server -- -t "requires an idempotency key"
npm test -w client -- src/services/authService.test.js
```

Server tests run with `cross-env NODE_ENV=test` (via the workspace script), which disables morgan logging in `app.js`. Setup: copy `server/.env.example` → `server/.env` and `client/.env.example` → `client/.env`; set a real `MONGODB_URI`. Health endpoints: `/api/health` and `/api/health/ready`.

## Architecture

Strict server-side layering — do not skip a layer:

```
Route → rate limiter → authenticate → authorize → validate → asyncHandler(controller) → service → model
```

- **Controllers are thin.** They translate HTTP only (see `server/src/controllers/transactionController.js`). All business rules, authorization-beyond-role, and ownership checks live in services.
- **`validate(schema)`** (`middleware/validate.js`) parses `{ body, params, query }` as one Zod object and *replaces* `req.body/params/query` with the parsed output. Validator schemas therefore nest under those keys, and `issue.path.slice(1)` strips the wrapper for error fields.
- **Errors**: throw `AppError(message, statusCode, errors?)`; wrap async controllers in `asyncHandler`. Success responses always go through `successResponse(res, {statusCode, message, data})` → `{ success, message, data }`.
- **Roles** are only `customer | employee | admin` (`models/User.js`). `authorize(...roles)` gates the role; the service must still verify resource ownership (queries include `owner: userId` in the predicate, e.g. `Account.findOne({ _id, owner: userId })`).

Client mirrors this: `pages/` (role-foldered) → `services/*Service.js` → `api/httpClient.js`. Route-level dynamic imports in `routes/AppRoutes.jsx` keep role pages and Recharts out of the initial bundle; `ProtectedRoute`/`RoleProtectedRoute` guard navigation (UI convenience only — the server is the authority).

## Money handling — non-negotiable invariants

- **All amounts are integer minor units** (`*Minor` fields, LKR cents). Never floats. Model validators enforce `Number.isSafeInteger`. Client converts at the edge only: `utils/money.js` (`parseMajorUnitsToMinor` uses BigInt, `formatMinorUnits` divides by 100).
- **Every financial write runs inside `mongoose.connection.transaction(fn, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })`** — debit, credit, transaction record, audit log, and notifications all share the one `session`. Pass `session` down to every helper (`createAuditLog`, `createNotification`, `flagAutomaticTransaction`).
- **Debits are conditional, never read-then-write.** `Account.findOneAndUpdate` includes `status: 'active'`, `availableBalanceMinor: { $gte: amount }`, and `ledgerBalanceMinor: { $gte: amount }` in the filter; a null result means insufficient funds. This is what prevents concurrent overdraw — do not replace it with a fetch-check-save.
- **Idempotency is mandatory on money-moving endpoints.** `requireIdempotencyKey` accepts an `Idempotency-Key` header *or* `body.idempotencyKey` (8–128 chars of `[A-Za-z0-9_-]`). The service hashes the request into a `requestHash` fingerprint; a replayed key with a different fingerprint is a 409, a matching one returns the original result with `duplicate: true` (HTTP 200 instead of 201). A duplicate-key error (`11000`) from a concurrent race falls back to `waitForConcurrentIdempotentResult`.
- **Financial records are never deleted.** Reversals create a new linked `reversal` transaction (`reversalOf`) and mark the original `reversed`; failures write a `failed` transaction row. Loan decisions are historical.

`transactionService.js` is the reference implementation for all of the above — read it before writing any new money flow, and reuse `transferMoney` rather than reimplementing (junior banking approvals call into it with `options.allowJunior`).

## Auth & security model

- Short-lived JWT access token (Bearer header, held in memory via `services/tokenStore.js`) + rotating refresh token in an HttpOnly cookie. `httpClient.js` has a single-flight 401 refresh interceptor that retries once, then clears the token and dispatches an `auth:expired` window event.
- `authenticate` re-loads the user each request and rejects if status isn't `active` or if `passwordChangedAt` post-dates the token `iat` — password change invalidates outstanding access tokens.
- Trusted devices are proven by a random HttpOnly cookie whose HMAC digest is stored (`DEVICE_TOKEN_SECRET`); user-agent strings are display hints only.
- Sensitive fields are `select: false` (`Account.accountNumber`, `Transaction.idempotencyKey/requestHash/senderAccountNumber/receiverAccountNumber`) — explicitly `.select('+accountNumber')` when needed, and mask on output (`presentTransaction` masks to last-4).
- `config/env.js` validates all env vars with Zod at boot and hard-fails production on placeholder/duplicate secrets, non-HTTPS `CLIENT_URL`, missing `MONGODB_URI`, or unconfigured SMTP. Adding a config value means adding it here, to `server/.env.example`, and to `render.yaml`.
- Runtime limits (transfer min/max, daily caps, suspicious threshold, loan rates) come from `settingService.getNumericSetting(key, envDefault)` — admin-configured DB settings override env defaults. Don't read `env.*` directly for these.

Layered defenses in `app.js`: helmet, CORS pinned to `CLIENT_URL` with credentials, `express-mongo-sanitize`, `hpp`, 10kb body limit, global `/api` rate limit (1000/15min) plus stricter per-route limiters (e.g. 30/15min on transfers).

## Testing conventions

Server API tests mock the service boundary and `authenticate` (injecting `req.user` with a role from an `x-test-role` header), then `await import('../app.js')` *after* the `vi.mock` calls — ESM hoisting requires this order. They assert authorization, validation, ownership, and duplicate-request behavior rather than hitting the DB. Service/model tests are focused units. Integration paths that exercise real transactions need a replica set or Atlas.

When changing behavior, add tests for success, validation, authorization, ownership, *and* duplicate requests (per `docs/CONTRIBUTING.md`), and update the relevant doc in `docs/`.

## Conventions

- ESM throughout (`"type": "module"`); server imports use explicit `.js` extensions.
- Prettier: single quotes, semicolons, trailing commas, 100 cols. ESLint runs with `--max-warnings 0`.
- Several models carry dual field names from an earlier phase (`amount`/`amountMinor`, `type`/`transactionType`, `reference`/`transferReference`, `senderUser`/`owner`). Queries use `$or` across both and reads use `??` fallbacks — preserve that pattern when touching transaction queries rather than assuming one name.
- Tailwind CSS for styling; no component library beyond `lucide-react` icons and `recharts`.

## Docs

`docs/` holds the authoritative feature specs: `ARCHITECTURE.md`, `SECURITY.md`, `API.md`, `DATABASE_SCHEMA.md`, plus per-feature docs (`TRANSFERS.md`, `FAMILY_BANKING.md`, `JUNIOR_BANKING.md`, `TRUSTED_DEVICES.md`, `BENEFICIARIES.md`, `ACCOUNTS.md`, `AUTHENTICATION.md`).
