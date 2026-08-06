# Duothan Banking Platform — Full Audit & Phase 03 Implementation Plan

> **Phase 03 · FORTIFY** — "Build the platform. Prove it works. Defend the system you designed, live in production."
> Audit date: 2026-08-06 · Branch: `main` · Commit: `757079d`

---

## 1. Baseline health (verified by execution, not assumed)

| Check                                                                   | Result                                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `npm run lint` (both workspaces, `--max-warnings 0`)                    | ✅ Clean                                                               |
| `npm test`                                                              | ✅ 174 server + 8 client tests pass                                    |
| `npm run build`                                                         | ✅ Builds in 9.4s                                                      |
| `npm run preflight:deploy`                                              | ✅ Passes                                                              |
| Secrets committed to git                                                | ✅ None — `.env.example` holds placeholders only, `.gitignore` correct |
| Route auth coverage                                                     | ✅ Every router gated correctly                                        |
| Money invariants (integer minor units, conditional debits, idempotency) | ✅ Server-side sound                                                   |

**The Phase 2 codebase is genuinely in good shape.** The real problem is not app bugs — it is that Phase 03 grades something the repo has almost none of.

---

## 2. The headline finding

Phase 03 marks are allocated as below. Current standing:

| Criterion                                         | Weight  | Current state                                        |
| ------------------------------------------------- | ------- | ---------------------------------------------------- |
| Build & Release Automation                        | **20%** | ❌ **No `.github/workflows` at all**                 |
| Service Deployment & Env Consistency              | **15%** | ⚠️ Render/Netlify YAML only; no containers           |
| Automated Infrastructure & Config Mgmt            | **15%** | ❌ **No Dockerfile, no IaC, no Terraform**           |
| Operational Visibility & System Health            | **15%** | ⚠️ Health endpoints only; no metrics/structured logs |
| Security Practices & Protection of Sensitive Data | **15%** | ⚠️ Good app-layer; gaps in §3                        |
| Scalability, Availability & Reliability           | **10%** | ⚠️ No autoscaling/replicas story                     |
| Engineering Best Practices                        | 5%      | ✅ Strong                                            |
| Team contributions                                | 5%      | ⚠️ Single-author git history                         |

**~50% of the marks sit in CI/CD, containers, and IaC — all currently at zero.** That is where effort must go, not into polishing pages.

**Structural note:** the brief says **"independent services."** This monorepo is a single Express API + SPA. Microservices are _not_ required — but client and API must be deployed as independently built, independently deployable, containerized services, and that choice must be justifiable during evaluation.

---

## 3. Issues found, by severity

### 🔴 Critical — fix before deploying

**C1. OTP codes are HMAC'd with the JWT signing secret** — `server/src/services/otpService.js:28,56`
`hashOtp(code, env.JWT_ACCESS_SECRET)` reuses the token-signing secret as a data-hashing key. This defeats the intent of `config/env.js:71-79`, which deliberately enforces three _distinct_ secrets in production. Rotating the JWT secret also silently invalidates every pending email verification.
→ Add a dedicated `OTP_HASH_SECRET` to `env.js`, `.env.example`, and `render.yaml`.

**C2. CSRF bypass when `Origin` header is absent** — `server/src/middleware/requireTrustedOrigin.js:6`
`if (origin && origin !== env.CLIENT_URL)` — a request with **no** `Origin` passes. This is the _only_ CSRF defense on `/api/auth/refresh` and `/api/auth/logout`, which are cookie-authenticated with **no** `authenticate` middleware (`authRoutes.js:58-59`). Compounded by `sameSite: 'none'` in production (`authController.js:32`), which explicitly opts the refresh cookie into cross-site sending.
→ Reject state-changing requests with a missing `Origin`; fall back to `Referer`; move to `sameSite: 'lax'` unless genuinely cross-domain.

**C3. Production `NODE_ENV` misconfiguration is silently catastrophic** — `config/env.js:6` defaults to `development`
If a deploy fails to set `NODE_ENV=production`: OTP codes print to stdout (`emailService.js:27,48`), stack traces ship in HTTP responses (`errorHandler.js:32`), _and_ every production guard in `env.js:63-94` is skipped.
→ Make `NODE_ENV` explicitly required (no default) in deployed environments.

### 🟠 High

| ID      | Issue                                                                                                                                                                                                                                                                           | Location                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **H1**  | OTP attempt budget resets via unlimited resend — the 429 from `issueOtp` is swallowed and returned as `200 "a new code has been sent"`. With IP-only rate limiting and a 6-digit code, an attacker rotating IPs can indefinitely mint fresh OTPs and reset the attempt counter. | `authService.js:186`                                                         |
| **H2**  | `/refresh` and `/logout` have no rate limiter. Unauthenticated, cookie-driven, several DB writes per call, covered only by the global 1000/15min cap.                                                                                                                           | `authRoutes.js:58-59`                                                        |
| **H3**  | Full error objects logged in production — `console.error(error)` dumps raw errors; `emailService.js:44` puts the **password-reset token in a URL query string**; `morgan('combined')` logs full URLs.                                                                           | `errorHandler.js:24`                                                         |
| **H4**  | Revoked devices can still log in — scored `high` risk, but `createSession` proceeds regardless. Revoking trust kills refresh tokens but doesn't stop that browser re-authenticating.                                                                                            | `trustedDeviceService.js:89-107`, `authService.js:283-289`                   |
| **H5**  | Password-reset enumeration via timing — unknown emails return immediately; known emails do an **awaited** SMTP round-trip. The reset token is also created _before_ the abuse check, which only records a signal and never blocks.                                              | `authService.js:292-321`                                                     |
| **H6**  | Legacy `status` field can override `accountStatus` via `(user.status \|\| user.accountStatus)`. A suspended user with a stale `status: 'active'` still authenticates.                                                                                                           | `authenticate.js:15`, `tokenService.js:69`                                   |
| **H7**  | `autoIndex: false` in production with no migration step. Indexes are never created in production — queries table-scan and unique constraints aren't enforced.                                                                                                                   | `config/database.js:15`                                                      |
| **H8**  | Client leaks full account numbers in `<option>` elements while every other surface masks. `Account.accountNumber` is `select: false` server-side precisely to prevent this.                                                                                                     | `LoansPage.jsx:127`, `FamilyGoalsPage.jsx:182`, `GuardianJuniorPage.jsx:170` |
| **H9**  | Client password rule disagrees with shared schema — validates only `minLength: 12`; `authSchemas.js:3-9` also requires upper/lower/digit/special. `aaaaaaaaaaaa` passes the client, fails the server.                                                                           | `ProfilePage.jsx:108`                                                        |
| **H10** | Silent failures — no `try/catch`; a failed resend still displays _"a new code has been sent."_                                                                                                                                                                                  | `NotificationsPage.jsx:41-44`, `VerifyEmailPage.jsx:34-40`                   |

### 🟡 Medium

| ID      | Issue                                                                                                                                                                                                 | Location                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **M1**  | `formatMinorUnits(undefined)` → **`"LKRNaN"`** (verified by execution)                                                                                                                                | `money.js:6`; hit by `TransferResultPage.jsx:20`, `TransactionDetailsPage.jsx:47` |
| **M2**  | `parseMajorUnitsToMinor` rejects `.50` (verified) — users commonly type leading-dot amounts                                                                                                           | `money.js:11`                                                                     |
| **M3**  | Float arithmetic on minor units — `(monthlyInstallmentMinor / 100).toFixed(2)`                                                                                                                        | `LoansPage.jsx:72`                                                                |
| **M4**  | `requestedAmount` has no numeric pattern; bad input throws a raw parser string                                                                                                                        | `LoansPage.jsx:154`                                                               |
| **M5**  | Filter enums drift from server — omits `loan_disbursement`, `loan_repayment`, `pending`, `processing`, `cancelled`                                                                                    | `TransactionHistoryPage.jsx:107-123`                                              |
| **M6**  | `useEffect(load, [])` returns a Promise — React receives it as the cleanup function                                                                                                                   | `TransactionMonitoringPage.jsx:31`                                                |
| **M7**  | **Navigation gap:** `/family/*`, `/junior`, `/guardian/junior`, `/security` reachable _only_ from the `/dashboard` sidebar. Pages like `/accounts` render in `AppLayout`, which has no links to them. | `AppLayout.jsx:62-71`                                                             |
| **M8**  | Empty `server/src/jobs/` — scheduled allowances have **no runner** (acknowledged in `KNOWN_LIMITATIONS.md`)                                                                                           | `server/src/jobs/`                                                                |
| **M9**  | `npm audit`: 2 high-severity `react-router` advisories (RSC-mode CSRF). Not exploitable here (no RSC), documented — but graders run `npm audit`.                                                      | `package-lock.json`                                                               |
| **M10** | Dead code: `AccountReviewPage.jsx` `close` path unreachable; `components/family/FamilyNav.jsx` imported by nobody                                                                                     | client                                                                            |

---

## 4. Implementation plan

### Phase A — Security hardening (before anything ships) · ~4h

1. `OTP_HASH_SECRET` across `env.js` / `.env.example` / `render.yaml` **(C1)**
2. Fix `requireTrustedOrigin` missing-Origin bypass; reconsider `sameSite` **(C2)**
3. Require explicit `NODE_ENV` in deployment **(C3)**
4. Propagate OTP 429; add per-account OTP attempt ceiling **(H1)**
5. Rate-limit `/refresh` + `/logout` **(H2)**
6. Redact error logging; move reset token out of the query string **(H3)**
7. Block logins from revoked devices **(H4)**
8. Fire-and-forget reset email; hard-block reset abuse **(H5)**
9. Prefer `accountStatus` over legacy `status` **(H6)**

### Phase B — Containerization & environment consistency (15%) · ~5h

10. Multi-stage `server/Dockerfile` (non-root user, `node:20-alpine`, healthcheck)
11. `client/Dockerfile` (build → nginx, SPA fallback + security headers ported from `netlify.toml`)
12. `docker-compose.yml` — API + client + MongoDB **replica set** (needed for transactions locally; also unlocks the integration tests `TESTING.md` says require one)
13. `.dockerignore` files
14. Startup index-sync step to fix `autoIndex` **(H7)**

### Phase C — CI/CD (20% — biggest single win) · ~5h

15. `.github/workflows/ci.yml` — lint → test → build → `npm audit` → Docker build, on every PR
16. `.github/workflows/cd.yml` — on `main`: build, tag, push images to GHCR, deploy, smoke-test `/api/health/ready`, auto-rollback on failure
17. `.github/workflows/codeql.yml` + dependency scanning (Trivy) — feeds the Security 15%
18. Branch protection + required checks; Dependabot
19. Resolve or formally document the `react-router` advisory **(M9)**

### Phase D — Observability (15%) · ~4h

20. Structured JSON logging (`pino`) replacing raw `console.error`/morgan
21. Request correlation IDs (`x-request-id`) threaded through logs and error responses
22. `prom-client` metrics at `/api/metrics` — HTTP latency/status histograms, DB pool, business counters (transfers, failed logins)
23. Deepen `/api/health/ready` — DB ping + SMTP reachability
24. Uptime monitoring + alerting; document the runbook

### Phase E — Reliability & scale (10%) · ~3h

25. Graceful shutdown hardening (drain in-flight requests before close)
26. Horizontal scaling config + documented autoscaling rules
27. **Externalize rate-limit store (Redis)** so limits hold across replicas — _currently in-memory, so limits are per-instance and break the moment you scale to 2_
28. Load-test script + documented results
29. Real allowance scheduler **(M8)**

### Phase F — Client fixes · ~3h

30. Mask account numbers in the three leaking selects **(H8)**
31. Align `ProfilePage` password validation with `passwordSchema` **(H9)**
32. Add `try/catch` to the two silent handlers **(H10)**
33. Guard `formatMinorUnits`; allow leading-dot parse; remove float division **(M1–M4)**
34. Sync filter enums; fix Promise-returning effect **(M5, M6)**
35. Fix navigation gap so family/junior/security are reachable app-wide **(M7)**
36. Remove dead code **(M10)**

### Phase G — Submission · ~2h

37. Deployment docs + screenshots (`docs/screenshots/` currently has only a README)
38. Verify public repo, live URL, `/api/health` reachable
39. **Spread commits across team accounts** — the 5% team-contributions mark is currently at risk from single-author history

---

## 5. Recommended order & judgement calls

**A → B → C → D → E → F → G.** Security first (it gates a safe deploy), then containers, then CI/CD — that sequence front-loads the 20% + 15% + 15% blocks currently scoring zero.

Two things to flag:

- **Phase F is the first thing to cut.** The client issues are real but almost entirely cosmetic-to-moderate — the server stays authoritative on every check, so **none are exploitable**. If time gets tight, cut Phase F before cutting C or D.
- **Item 27 (Redis-backed rate limiting) is a genuine correctness blocker** for the scalability criterion. The current in-memory limiter silently stops working the instant more than one replica runs — which is exactly what the 10% asks you to demonstrate.

---

## 6. Deliverables checklist (from the brief)

- [ ] Public GitHub repository link (repo must contain application code, **infrastructure definitions**, and **pipeline configuration**)
- [ ] Live deployed application URL or IP address (reachable and functional before submission)
- [ ] Brief deployment documentation with screenshots

Submission: `duothan.ieeensbm.org/submission`
