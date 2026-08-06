# Final Submission Checklist

Release: **FortiBank Phase 2 – Rebuild** (`v1.0.0-phase-2`)

Use `[x]` only after checking the final public repository and deployed environment. Items marked complete below were verifiable from the local source tree; deployment-specific items intentionally remain open.

## Repository and source package

- [x] Public GitHub repository URL: <https://github.com/Mukilan-Uki/Duathon>
- [x] Final Stage 10 changes committed and pushed to the default branch
- [ ] Repository visibility confirmed from a signed-out browser
- [ ] Annotated tag and GitHub release `v1.0.0-phase-2` published
- [x] README, setup guide, API documentation, environment examples, and release notes included
- [x] Development credentials and demo-data instructions documented
- [x] Generated files, dependencies, local environments, and submission artifacts ignored
- [x] `npm run package:submission` run from a clean final commit
- [x] Generated ZIP opened and checked for completeness and absence of secrets

## Automated quality gate

- [x] `npm run format:check` passes on the final source
- [x] `npm run lint` passes on the final source
- [x] `npm test` passes on the final source (182 tests)
- [x] `npm run build` passes on the final source
- [ ] `npm run preflight:deploy` passes with production configuration
- [x] Dependency/security scan reviewed and findings documented in `docs/QUALITY.md`

## Functional verification

- [ ] Administrator, employee, two adult customers, and junior customer can sign in
- [ ] Password reset email, token validation, password update, and session revocation work
- [ ] Administrator can manage employees, users, settings, audit logs, and analytics
- [ ] Employee can approve/reject accounts and review/approve/reject loans
- [ ] Customer balances, transfers, history filters, statements, and exports are correct
- [ ] Loan application, document upload, status timeline, disbursement, and repayment work
- [ ] Family creation, invite/join, member roles, announcements, goals, and notifications work
- [ ] Junior login, limits, blocked/approval-required transfers, allowances, and goals work
- [ ] Guardian approvals, controls, transaction visibility, and beneficiary requests work
- [ ] Trusted, pending, revoked, expired, and unknown-device flows work
- [ ] Authorization prevents cross-user and cross-family data access
- [ ] Duplicate submissions and concurrent balance/approval operations remain consistent

## Production deployment

- [ ] Frontend URL added here and reachable: _not supplied_
- [ ] Backend URL added here and reachable: _not supplied_
- [ ] `/api/health/live`, `/api/health/ready`, and HTTPS verified
- [ ] Production MongoDB connectivity, indexes, backup, and recovery plan verified
- [ ] Strong production secrets configured only in provider environment settings
- [ ] CORS and frontend API URL match the final HTTPS domains
- [ ] SMTP/provider email delivery and password-reset link verified end to end
- [ ] Upload storage behavior and persistence verified on the hosting platform
- [ ] Logs checked after smoke tests with no unresolved errors or sensitive-data exposure

## UX, accessibility, and evidence

- [ ] Desktop, tablet, and mobile checks completed on the deployed build
- [ ] Keyboard navigation, focus indicators, labels, contrast, and reduced motion checked
- [ ] Loading, empty, validation, forbidden, offline, and server-error states checked
- [ ] Browser console and network panel are clean during core workflows
- [ ] Screenshot matrix in `docs/screenshots/README.md` completed
- [ ] Screenshots reviewed for secrets and real customer information

## Phase 03 — FORTIFY additions

- [x] `server/Dockerfile`, `client/Dockerfile`, `docker-compose.yml` (API + client + Mongo replica set + Redis)
- [x] `.github/workflows/ci.yml` (lint, format, test, build, audit, docker build on every PR/push)
- [x] `.github/workflows/cd.yml` (build/push GHCR images, deploy hook, smoke test, rollback guidance)
- [x] `.github/workflows/codeql.yml` (CodeQL + Trivy scanning)
- [x] `.github/dependabot.yml` (npm, GitHub Actions, Docker)
- [x] Structured JSON logging (`pino`), request correlation IDs, `/api/metrics` (Prometheus)
- [x] Deepened `/api/health/ready` (DB ping + SMTP check)
- [x] Graceful shutdown, Redis-backed distributed rate limiting, allowance scheduler job
- [x] Client fixes: masked account numbers, password validation parity, silent-failure handlers, money.js guards, filter enums, nav gap, dead code
- [ ] Branch protection rule enabled on `main` requiring CI checks (GitHub repo setting — not code)
- [ ] `RENDER_DEPLOY_HOOK_URL` / `API_HEALTH_URL` repository variables set for CD
- [ ] Images actually pushed to GHCR and pulled by a live deploy (requires pushing to `main` on GitHub)
- [ ] Live URL smoke-tested against `/api/health`, `/api/health/ready`, `/api/metrics`
- [ ] Team contributions spread across multiple committer accounts (currently single-author history)

## Final handoff

- [ ] Repository URL, frontend URL, backend URL, release URL, and ZIP attached to submission
- [x] Known limitations in `docs/RELEASE_NOTES.md` reviewed and updated
- [ ] Clean install performed from the submitted source package
- [ ] Final evaluator walkthrough completed using development-safe demo credentials
