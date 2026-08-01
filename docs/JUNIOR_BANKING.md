# Junior Banking

Junior Banking uses a `JuniorProfile` linked to a normal customer identity. The browser cannot assign a junior or guardian role: family membership and embedded guardian permissions are checked by the API on every operation.

Money is stored as integer LKR minor units. Junior transfers, allowances, and guardian goal contributions delegate to the existing idempotent transfer service. Transaction approval revalidates the junior account, receiver, balance, request expiry, per-transaction limit, and rolling daily, weekly, and monthly limits before moving money.

## Main endpoints

- `POST /api/junior-banking/profiles`
- `POST /api/junior-banking/profiles/:juniorId/account`
- `GET|PATCH /api/junior-banking/:juniorId/controls`
- `POST|GET /api/junior-banking/:juniorId/allowances`
- `POST /api/junior-banking/allowances/:allowanceId/execute`
- `POST /api/junior-banking/transactions/request`
- `GET /api/junior-banking/transactions/my-requests`
- `GET /api/junior-banking/approvals/pending`
- `PATCH /api/junior-banking/approvals/:requestId/approve|reject`
- `POST|PATCH|DELETE /api/junior-banking/beneficiaries/...`
- `POST /api/junior-banking/goals`
- `GET /api/junior-banking/:juniorId/goals`
- `POST /api/junior-banking/goals/:goalId/contribute`
- `POST /api/junior-banking/:juniorId/convert-to-adult`

## Allowance scheduling

This prototype deliberately does not start a scheduler inside the web process. A trusted worker may find due active allowances and call the execute endpoint with a unique idempotency key. Production should use a durable queue such as BullMQ or a managed scheduler with distributed locking, retries, and dead-letter monitoring.

## Limitations

- Adult conversion requires staff initiation; a separate guardian conversion-request queue is not included.
- “Impossible travel” and transaction-category classification remain policy foundations rather than production fraud engines.
- Production identity verification and legal guardian verification require integration with an approved KYC provider.
