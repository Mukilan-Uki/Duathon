# Deployment guide

## Production architecture

```text
Browser → Netlify React SPA (or nginx container) → HTTPS → Render Express API (or container) → MongoDB Atlas
                                                            └───────────────→ SMTP provider
                                                            └───────────────→ Redis (rate-limit store)
```

The client and API are built and deployed as two independently versioned, independently deployable containers (`client/Dockerfile`, `server/Dockerfile`) — see `docker-compose.yml` for local orchestration including a MongoDB replica set (required for multi-document transactions) and Redis. This is intentionally not a microservices split: the brief's "independent services" requirement is satisfied by independently built/deployed client and API images, which is the correct granularity for this domain.

Use separate development, staging, and production databases. Never seed demo users into production.

## 0. Local container stack

```bash
cp server/.env.example server/.env   # fill in real secrets
docker compose up --build
```

- API: `http://localhost:5000` (health: `/api/health`, readiness: `/api/health/ready`, metrics: `/api/metrics`)
- Client: `http://localhost:8080`
- Mongo runs as a single-node replica set (`rs0`) so `mongoose.connection.transaction()` works locally.
- Redis backs rate limiting so per-instance limits are consistent across replicas (see §6).

## 1. MongoDB Atlas

1. Create a dedicated production database user with a unique generated password.
2. Grant only the database permissions required by the application.
3. Configure Atlas network access for the Render service. Avoid `0.0.0.0/0` where a stable outbound range or private connection is available.
4. Use a connection string that specifies a database name such as `duothan`.
5. Enable backups and monitoring appropriate to the selected Atlas tier.

## 2. Render API

Create the service from the repository Blueprint using `render.yaml`, or configure:

- Build: `npm ci`
- Start: `npm start --workspace server`
- Health check: `/api/health/ready` (returns 503 until MongoDB is connected)
- Runtime: Node.js 20+

Required variables:

| Variable                                | Production value                                      |
| --------------------------------------- | ----------------------------------------------------- |
| `NODE_ENV`                              | `production`                                          |
| `MONGODB_URI`                           | Atlas production connection string                    |
| `CLIENT_URL`                            | Exact Netlify origin, without a trailing slash        |
| `JWT_ACCESS_SECRET`                     | Unique cryptographically random value, 32+ characters |
| `JWT_REFRESH_SECRET`                    | Different random value, 32+ characters                |
| `DEVICE_TOKEN_SECRET`                   | Third distinct cryptographically random secret        |
| `DEVICE_COOKIE_NAME`                    | `duothan_device`                                      |
| `DEVICE_TRUST_DAYS`                     | Reviewed device trust lifetime, default 90            |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP provider configuration                           |
| `SMTP_USER`, `SMTP_PASSWORD`            | Provider credentials                                  |
| `EMAIL_FROM`                            | Verified sender identity                              |

Review optional limits and loan-rate variables in `server/.env.example`. Do not configure `DEMO_SEED_PASSWORD` in production.

Additional variables introduced in Phase 03:

| Variable          | Production value                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `OTP_HASH_SECRET` | Fourth distinct cryptographically random secret (separate from JWT secrets)                                                               |
| `LOG_LEVEL`       | `info` (structured JSON via pino; `debug` for troubleshooting only)                                                                       |
| `REDIS_URL`       | Managed Redis connection string; rate limiting falls back to in-memory per-instance limits if unset, which does not hold under >1 replica |

Render's free-tier web service builds from source (`buildCommand`/`startCommand` in `render.yaml`); the CI-built container images published to GHCR (see §5) are for any environment that deploys from an image registry instead (e.g. a VPS, ECS, or a paid Render/Fly.io service). Add `LOG_LEVEL` and `REDIS_URL` alongside the required variables above.

## 3. Netlify client

Import the repository into Netlify. `netlify.toml` builds the client and provides the SPA fallback.

Set:

```text
VITE_API_URL=https://<render-service>.onrender.com/api
```

Trigger a new client deployment after the API URL changes. `VITE_*` variables are embedded during the client build and must never contain secrets.

## 5. CI/CD pipeline

`.github/workflows/ci.yml` runs on every PR and push to `main`: install → lint → format check → test (both workspaces) → client build → `npm audit` (non-blocking) → Docker build of both images (no push). `.github/workflows/codeql.yml` runs CodeQL static analysis and a Trivy filesystem scan on the same triggers plus a weekly schedule, uploading SARIF results to the repository's Security tab.

`.github/workflows/cd.yml` runs on push to `main`: builds and pushes both images to GHCR tagged `latest` and `<short-sha>`, then (if `vars.RENDER_DEPLOY_HOOK_URL` is set) triggers a Render deploy and polls `vars.API_HEALTH_URL` (`/api/health/ready`) for up to ~100s. A failed smoke test surfaces a GitHub Actions error annotation; roll back via the Render dashboard to the previous successful deploy, or redeploy the prior image tag from GHCR.

Configure in the repository settings before relying on CD:

- **Branch protection** on `main`: require the CI `lint-test-build` and `docker-build` checks before merge.
- **Repository variables**: `RENDER_DEPLOY_HOOK_URL`, `API_HEALTH_URL` (both optional — CD skips the deploy/smoke steps if unset, but still builds and publishes images).
- **Dependabot** (`.github/dependabot.yml`) opens weekly PRs for npm, GitHub Actions, and both Dockerfiles.

The `react-router` advisory `GHSA-qwww-vcr4-c8h2` (RSC-mode CSRF) is tracked but not exploitable here — this SPA uses declarative mode only, no RSC. See `docs/SECURITY.md` and `docs/QUALITY.md`.

## 6. Observability

- **Structured logs**: `pino` (JSON) replaces raw `console.error`/morgan in production; `LOG_LEVEL` controls verbosity. Every request gets an `x-request-id` (from the incoming header if present, otherwise generated), echoed on the response and included in error logs for correlation.
- **Metrics**: `GET /api/metrics` exposes Prometheus-format metrics — default Node process metrics plus `http_request_duration_seconds` and `http_requests_total` (labeled by method/route/status). Point a Prometheus scrape config or a hosted equivalent (Grafana Cloud, Render's metrics) at this endpoint.
- **Health**: `GET /api/health` is liveness (always 200 once the process is up). `GET /api/health/ready` is readiness — pings MongoDB and (in production) requires SMTP to be configured, returning 503 until both are true. Point uptime monitoring (e.g. UptimeRobot, Better Uptime) at `/api/health` for external alerting, and use `/api/health/ready` as the container/load-balancer health check.

## 7. Reliability & scale

- **Graceful shutdown**: `SIGTERM`/`SIGINT` stop the allowance scheduler, stop accepting new connections, drain in-flight requests (10s timeout before a forced exit), then close the MongoDB connection.
- **Horizontal scaling**: the API is stateless (JWT access tokens, DB-backed refresh tokens) and safe to run as multiple replicas behind a load balancer, provided `REDIS_URL` is set — see below.
- **Redis-backed rate limiting**: every `express-rate-limit` instance (global, login, recovery, registration, session, transfer, account-application, beneficiary-lookup, family-invitation, security-sensitive) uses a shared Redis store when `REDIS_URL` is configured, so limits hold across replicas instead of resetting per-instance. Without `REDIS_URL` the limiters fall back to in-memory state, which is fine for a single instance but silently stops enforcing shared limits the moment a second replica is added.
- **Allowance scheduler**: `server/src/jobs/allowanceScheduler.js` polls due `JuniorAllowance` records hourly and disburses them via the same `transferMoney` service used by interactive transfers (idempotency key derived from allowance ID + scheduled run time, so a scheduler restart never double-pays).

## 4. Cross-origin authentication

The production refresh cookie is HTTP-only, Secure, and `SameSite=None` because Netlify and Render use different origins. `CLIENT_URL` must exactly match the browser origin so CORS and trusted-origin checks accept refresh and logout requests.

## 8. Release verification

Run the local configuration and tracked-secret check before deployment:

```bash
npm run preflight:deploy
npm ci
npm run lint
npm test
npm run build
```

1. Confirm `GET /api/health` returns liveness, `GET /api/health/ready` returns HTTP 200 with `database: connected`, and `GET /api/metrics` returns Prometheus text output.
2. Register and verify a new test customer through the configured email provider.
3. Confirm login, refresh, logout, and password reset.
4. Test one account review, transfer, receipt, loan review, and repayment using test funds.
5. Confirm notifications, investigations, audit records, and settings authorization.
6. Inspect browser cookies and confirm the refresh token is not readable by JavaScript.
7. Verify CSP, `X-Frame-Options`, and `X-Content-Type-Options` response headers.
8. Check Render, Atlas, email, and Netlify logs without recording secrets or customer data.
9. Refresh deep frontend routes such as `/security` and `/family/goals` and confirm the SPA fallback avoids a 404.
10. Confirm Family Banking, Junior Banking and Trusted Devices against production-like test identities.

Record the verified frontend/API URLs and timestamp in the submission checklist. Local preparation does not prove that external services are deployed.

## Rollback

Retain the last known-good Netlify deploy and Render deployment. Roll back application code before attempting database repair. Completed financial records must never be deleted. Any corrective financial operation should use a reviewed reversal workflow and create an audit record.
