# Quality assurance

## Automated checks

Run the complete local quality gate from the repository root:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm audit --omit=dev
```

The test suite covers authentication, role authorization, validation, centralized errors, accounts, beneficiaries, transfers, idempotency, insufficient funds, loans, dashboards, notifications, investigations, and system administration APIs. Client tests cover the public application foundation and protected-route behavior for unauthenticated, authorized, and unauthorized users.

## Phase 9 review

- **Error handling:** malformed JSON, invalid database identifiers, database validation failures, duplicate keys, operational errors, and unexpected failures receive safe, consistent responses.
- **Accessibility:** keyboard focus indicators, a skip link, semantic dialogs, labelled investigation forms, status announcements, and reduced-motion preferences are supported.
- **Responsive behavior:** dashboard navigation scrolls horizontally on narrow screens and becomes a sidebar on desktop. Tables use horizontal overflow rather than clipping financial data.
- **Performance:** page modules are route-split with `React.lazy`, including chart-heavy dashboards. The production build verifies all generated chunks.
- **Security:** authentication and role boundaries have automated tests. Production secrets are validated, financial operations remain server-authoritative, and security headers are enabled through Helmet.

## Manual release checks

Before deployment, test each role at mobile, tablet, and desktop widths. Complete registration, verification, login, account review, transfer, loan, notification, monitoring, and administration journeys using non-production test data. Verify keyboard-only navigation, visible focus, error announcements, print receipts, refresh-token expiry, and logout.

## Dependency advisory note

The July 2026 React Router advisory `GHSA-qwww-vcr4-c8h2` applies only to unstable React Server Component APIs. Duothan uses React Router declarative mode through `BrowserRouter` in a client-only Vite SPA and does not use the affected RSC APIs. React Router 8.3.0 contains the upstream patch but is a major-version migration. The project retains the current version until that migration is tested; teams should track the advisory and re-run the audit before release.
