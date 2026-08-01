# Known Limitations

- Educational prototype; no bank-grade, PCI DSS, SOC 2 or regulatory certification is claimed.
- Deployment URLs and public repository status have not been verified from this workspace.
- Email depends on an external SMTP provider; development may log codes locally.
- Trusted-device confirmation uses passwords rather than enrolled MFA.
- Device/IP risk scoring is heuristic and has no geolocation or impossible-travel provider.
- Junior guardian and identity verification needs an approved KYC/legal workflow.
- Scheduled allowances require a durable external worker or queue; the API process does not run a production scheduler.
- Currency support is limited to LKR.
- Loan calculations use prototype simple-interest policy rather than a configurable banking product engine.
- Automated tests do not replace staging tests against a real Atlas replica set, SMTP service and cross-domain deployment.
- React Router has a disclosed RSC-only advisory; this SPA does not deploy RSC/server-action handlers, and an upstream patched release should be adopted when available.
- Screenshots, team details, final public URLs, demonstration video and real provider verification remain submission-owner tasks.
