# Bank account management

Phase 3 provides account application, approval, safe account viewing, and staff-managed status
changes. It does not provide balance editing or financial operations.

## Lifecycle

1. An authenticated customer applies with an account type and branch code.
2. The application is stored as `pending` with zero integer minor-unit balances and no account
   number.
3. An employee or administrator approves or rejects the application.
4. Approval generates a unique account number on the server and activates the account.
5. Staff can suspend or reactivate accounts. Only administrators can close an account.
6. Closed accounts are retained and cannot be reactivated.

Applications, reviews, and status changes create immutable audit records. Review and status
decisions create customer notifications.

## API

| Method | Endpoint | Roles |
| --- | --- | --- |
| POST | `/api/accounts/apply` | customer |
| GET | `/api/accounts/my-accounts` | customer |
| GET | `/api/accounts/:accountId` | owner, employee, admin |
| GET | `/api/accounts/pending` | employee, admin |
| GET | `/api/accounts/search` | employee, admin |
| PATCH | `/api/accounts/:accountId/approve` | employee, admin |
| PATCH | `/api/accounts/:accountId/reject` | employee, admin |
| PATCH | `/api/accounts/:accountId/suspend` | employee, admin |
| PATCH | `/api/accounts/:accountId/reactivate` | employee, admin |
| PATCH | `/api/accounts/:accountId/close` | admin |

List responses contain masked account numbers. The full number is returned only by an authorized
account-detail request. Passwords, authentication secrets, and internal audit data are never part
of account responses.

## Future closure checks

`validateAccountClosure` is the Phase 3 service boundary for future unsettled transfers, loans,
holds, disputes, and other unresolved conditions. It currently succeeds because those systems are
outside this phase.
