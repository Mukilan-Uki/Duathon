# Secure internal transfers

Phase 4 processes internal LKR transfers using integer minor units and a MongoDB multi-document
transaction. It does not provide customer cancellation, loans, reporting, or advanced fraud
detection.

## Atomic processing

The service validates limits and idempotency, then starts a Mongoose transaction with snapshot
reads and majority writes. Inside the transaction it:

1. rechecks idempotency and daily usage;
2. loads both accounts and verifies ownership, status, and currency;
3. creates a pending transaction record;
4. conditionally debits the active sender only when both balances are sufficient;
5. conditionally credits the active receiver;
6. marks the record completed;
7. writes audit events and notifications using the same session.

An exception aborts every session write. When both participants are known, a separate failed
transaction and safe audit event are recorded after rollback. Conditional debit filters prevent
concurrent requests from overspending.

MongoDB Atlas replica-set and supported sharded clusters support this transaction flow. A standalone
local `mongod` does not; local development must use a replica set or Atlas.

## Idempotency

Clients submit an 8–128 character idempotency key in the `Idempotency-Key` header or request body.
The service stores the key with a SHA-256 fingerprint of the authenticated user and normalized
transfer fields. A matching retry returns the prior result without moving money. Reusing the key
with different data returns HTTP 409.

## Endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/transfers/validate-recipient` | customer |
| POST | `/api/transfers` | customer |
| GET | `/api/transactions/my-transactions` | customer |
| GET | `/api/transactions/:transactionId` | participant, employee, admin |
| GET | `/api/transactions/:transactionId/receipt` | participant, employee, admin |

Recipient responses and transaction views contain masked names/account numbers and never expose
balances, contact details, credentials, token material, or raw request metadata.

## Reversals

`createReversalFoundation` performs an administrator-only linked reversal in a MongoDB transaction.
It requires a reason, verifies the original completed transfer has not already been reversed,
conditionally debits the original receiver, credits the original sender, creates a new immutable
`reversal` record, marks the original reversed, audits the action, and notifies both customers.
No customer endpoint or frontend reversal control is exposed in Phase 4.
