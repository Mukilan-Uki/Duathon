# FortiBank Phase 2 – Rebuild

Release identifier: `v1.0.0-phase-2`

## Included

- Secure authentication, password recovery, session handling, and trusted-device review
- Customer, employee, and administrator workflows
- Account approval, internal transfers, transaction history, and account statements
- Loan application, document review, approval, and repayment workflows
- Family groups, junior accounts, guardian controls, allowances, goals, and approvals
- Notifications, audit history, security controls, responsive layouts, tests, and deployment configuration

## Verification target

Before publishing, run:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run preflight:deploy
```

## Source package

After committing all final changes, run `npm run package:submission`. It creates `artifacts/duothan-banking-platform-v1.0.0-phase-2.zip` from tracked files at `HEAD`, preventing ignored `.env` files and other local secrets from entering the archive.

## Release publication

After the final commit is on the public repository, create an annotated tag named `v1.0.0-phase-2` with the title **FortiBank Phase 2 – Rebuild**, push the tag, and use this file as the release notes. Add the generated source ZIP to the release if the submission portal requires a separate archive.

## Known operational requirements

- Production requires MongoDB, strong JWT and session secrets, the deployed frontend origin, and configured email delivery.
- Demo credentials and demo data are development-only.
- Deployment URLs, screenshots, mobile-device checks, and provider-level email delivery must be verified against the final live environment.
