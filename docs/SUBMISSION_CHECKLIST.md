# Final submission checklist

## Repository

- [ ] Repository visibility and team access are correct.
- [ ] Default branch is protected and the final changes are committed.
- [ ] Working tree is clean.
- [ ] `.env`, credentials, tokens, OTP values, and real customer data are absent from Git history.
- [ ] README setup and command examples were tested on a clean clone.
- [ ] Commit history uses meaningful messages.

## Functional demonstration

- [ ] Customer registration, verification, login, refresh, logout, and reset work.
- [ ] Account application and employee review work.
- [ ] Transfer success, insufficient funds, duplicate submission, and receipt flows work.
- [ ] Beneficiary creation and removal work.
- [ ] Loan application, decision, disbursement, and repayment work.
- [ ] All three dashboards load with role-appropriate information.
- [ ] Notifications, monitoring, audit logs, and settings work.
- [ ] Unauthorized users cannot access another role's pages or APIs.

## Quality and security

- [ ] `npm run format:check` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] Dependency audit results are reviewed and documented.
- [ ] Mobile, tablet, desktop, keyboard-only, reduced-motion, empty, loading, and error states were reviewed.
- [ ] MongoDB transactions and idempotency were demonstrated with a replica-set-capable database.
- [ ] Production secrets are unique and stored only in provider secret management.
- [ ] The exposed Atlas password identified during Phase 10 was rotated.

## Deployment

- [ ] MongoDB Atlas production user, access rules, backup, and monitoring are configured.
- [ ] Render health check reports a connected database.
- [ ] Netlify uses the correct `VITE_API_URL`.
- [ ] Render uses the exact Netlify origin for `CLIENT_URL`.
- [ ] SMTP sender identity and delivery are verified.
- [ ] Production refresh cookies are Secure and HTTP-only.
- [ ] Logs do not contain secrets or sensitive financial payloads.
- [ ] Last known-good deployments and rollback owners are recorded.

## Submission material

- [ ] Public URL and API health URL are included.
- [ ] Screenshots use demo data and cover all three roles plus mobile.
- [ ] Architecture, API, security, quality, user, and deployment documents are linked.
- [ ] Demo credentials are shared through an approved private channel, not committed.
- [ ] Known limitations and the React Router advisory assessment are disclosed.
