# API Documentation

Base URL: `/api`

`GET /health` is public and reports API availability, database connection state, process uptime, and timestamp. Successful responses use `{ "success": true, "message": "...", "data": {} }`. Errors use `{ "success": false, "message": "...", "errors": [] }`.

## Authentication

| Method | Endpoint                    | Access          | Purpose                             |
| ------ | --------------------------- | --------------- | ----------------------------------- |
| POST   | `/auth/register`            | Public          | Register a customer                 |
| POST   | `/auth/verify-email`        | Public          | Verify a six-digit email code       |
| POST   | `/auth/resend-verification` | Public, limited | Request another verification code   |
| POST   | `/auth/login`               | Public, limited | Sign in and receive an access token |
| POST   | `/auth/refresh`             | Refresh cookie  | Rotate the refresh token            |
| POST   | `/auth/logout`              | Public          | Revoke the refresh session          |
| POST   | `/auth/forgot-password`     | Public, limited | Request a reset code                |
| POST   | `/auth/reset-password`      | Public, limited | Reset using the code                |
| GET    | `/auth/me`                  | Bearer token    | Fetch the authenticated user        |
| GET    | `/auth/login-history`       | Bearer token    | Fetch the latest 20 login events    |
| PATCH  | `/auth/change-password`     | Bearer token    | Change password and revoke sessions |
| GET    | `/auth/admin-check`         | Admin only      | Demonstrate role enforcement        |

The access token is held in client memory. The signed refresh token is only stored in an HttpOnly cookie and only its hash is persisted.

## Accounts

All account endpoints require a Bearer access token.

| Method | Endpoint                      | Role            | Purpose                                         |
| ------ | ----------------------------- | --------------- | ----------------------------------------------- |
| POST   | `/accounts`                   | Customer        | Submit a Savings or Current account application |
| GET    | `/accounts/me`                | Customer        | List the authenticated customer’s accounts      |
| GET    | `/accounts/:accountId`        | Owner or staff  | View an authorized account                      |
| GET    | `/accounts/pending`           | Employee, admin | List pending applications                       |
| PATCH  | `/accounts/:accountId/review` | Employee, admin | Approve or reject a pending account             |
| PATCH  | `/accounts/:accountId/status` | Employee, admin | Activate or suspend; only admin may close       |

Account numbers and balances are never accepted from the client. Balance values use integer LKR minor units.

## Transactions

| Method | Endpoint                               | Role            | Purpose                                  |
| ------ | -------------------------------------- | --------------- | ---------------------------------------- |
| POST   | `/transactions/transfer`               | Customer        | Atomically transfer money                |
| GET    | `/transactions/history`                | Customer        | Search/filter paginated personal history |
| GET    | `/transactions/monitor`                | Employee, admin | Read-only transaction monitoring         |
| GET    | `/transactions/:transactionId`         | Owner or staff  | View authorized details                  |
| GET    | `/transactions/:transactionId/receipt` | Owner or staff  | Generate receipt data                    |

Transfer requests require an `Idempotency-Key` header containing 8–128 letters, numbers, underscores, or hyphens. The JSON body contains:

```json
{
  "senderAccountId": "507f1f77bcf86cd799439011",
  "receiverAccountNumber": "609876543210",
  "amountMinor": 1050,
  "description": "Invoice 42"
}
```

History accepts `search`, `direction`, `type`, `status`, `dateFrom`, `dateTo`, `page`, and `limit`. Dates use `YYYY-MM-DD`.

## Beneficiaries

All beneficiary endpoints require an authenticated customer.

| Method | Endpoint                        | Purpose                                      |
| ------ | ------------------------------- | -------------------------------------------- |
| POST   | `/beneficiaries`                | Validate and save an active external account |
| GET    | `/beneficiaries`                | List the customer’s saved beneficiaries      |
| DELETE | `/beneficiaries/:beneficiaryId` | Remove an owned beneficiary preference       |

Creation accepts a 12-digit `accountNumber` and a 2–60 character `nickname`. The server resolves the account and stores the registered account name; it rejects inactive, self-owned, nonexistent, and duplicate accounts.

## Loans

| Method | Endpoint                                    | Role            | Purpose                            |
| ------ | ------------------------------------------- | --------------- | ---------------------------------- |
| POST   | `/loans/applications`                       | Customer        | Submit a loan application          |
| GET    | `/loans/applications/me`                    | Customer        | Track application decisions        |
| GET    | `/loans/applications`                       | Employee, admin | List pending or previous decisions |
| PATCH  | `/loans/applications/:applicationId/review` | Employee, admin | Approve/disburse or reject         |
| GET    | `/loans/me`                                 | Customer        | List active and previous loans     |
| GET    | `/loans/:loanId/payments`                   | Customer        | List owned loan payments           |
| POST   | `/loans/:loanId/payments`                   | Customer        | Make an idempotent repayment       |

Applications accept `disbursementAccountId`, `loanType`, `requestedAmountMinor`, `purpose`, and `repaymentMonths`. Payment requests require an `Idempotency-Key` header and contain `sourceAccountId` and `amountMinor`.
