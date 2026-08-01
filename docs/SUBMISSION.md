# Submission Handoff

## Project

- **Name:** Duothan Banking Platform
- **Release:** FortiBank Phase 2 – Rebuild
- **Version:** `v1.0.0-phase-2`
- **Repository:** <https://github.com/Mukilan-Uki/Duathon>
- **Default branch:** `main`
- **Frontend URL:** Not supplied
- **Backend URL:** Not supplied

## Verified source status

The final merged source passed:

- Prettier formatting check
- Client and server ESLint checks
- 182 automated tests: 8 client and 174 server
- Vite production build
- Deployment configuration preflight

These checks verify the source tree, not an external hosting provider. The live deployment, provider environment variables, MongoDB connectivity, email delivery, mobile-device behavior, and screenshots must still be confirmed if the evaluator requires them.

## Submission files

- Repository source on the `main` branch
- `README.md` for overview and local setup
- `docs/RELEASE_NOTES.md` for release scope
- `docs/DEMO_CREDENTIALS.md` for development-only evaluator accounts
- `docs/SUBMISSION_CHECKLIST.md` for final verification
- `docs/screenshots/README.md` for required evidence
- `artifacts/duothan-banking-platform-v1.0.0-phase-2.zip` after running `npm run package:submission` from the clean final commit

## Evaluator setup

```bash
npm install
copy server\.env.example server\.env
copy client\.env.example client\.env
npm run seed:demo
npm run dev
```

Configure `MONGODB_URI`, authentication secrets, and a development-only `DEMO_SEED_PASSWORD` before seeding. On macOS or Linux, use `cp` instead of `copy`.

## Security note

The repository and generated ZIP must not contain `.env` files, passwords, JWT secrets, database credentials, SMTP credentials, access tokens, OTPs, or real customer data. Demo data is prohibited in production.
