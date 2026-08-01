# Beneficiary and saved payee management

Phase 5 lets authenticated customers save internal Duothan accounts for later transfers. Saved
records never contain balances, contact details, addresses, credentials, or authentication data.

## Ownership and lifecycle

Every beneficiary query and mutation is scoped by both the beneficiary identifier and the
authenticated customer's user identifier. Customers cannot supply or change `owner`, the linked
account, or its account-number snapshot.

Removing a beneficiary changes its status to `inactive`; it does not delete the document or affect
transaction history. An inactive beneficiary can be restored only when its linked account still
exists and is active. A `blocked` beneficiary cannot be edited, removed, restored, or used by a
customer.

## Safe account verification

Account lookup attempts through `POST /api/beneficiaries/verify-account` and direct beneficiary
creation share a rate limit so the creation endpoint cannot bypass enumeration protection. Account
verification returns only:

- masked account-holder name;
- masked account number;
- account type;
- whether the account can receive transfers.

It never returns a customer profile, balance, email address, phone number, or internal account ID.

## Transfer integration

Saved-payee transfers submit `beneficiaryId` instead of an account number. Inside the existing
MongoDB transfer transaction, the service:

1. loads the beneficiary using both `_id` and the authenticated owner;
2. requires beneficiary status `active`;
3. resolves and revalidates the linked receiver account;
4. uses the existing conditional debit, credit, idempotency, limits, audit, and notification flow;
5. updates `lastUsedAt` using the same session only after successful processing.

If the transfer aborts, the `lastUsedAt` update rolls back with every balance and transaction write.

## API

| Method | Endpoint                                    | Purpose                                     |
| ------ | ------------------------------------------- | ------------------------------------------- |
| POST   | `/api/beneficiaries/verify-account`         | Verify a possible payee safely              |
| POST   | `/api/beneficiaries`                        | Save a beneficiary                          |
| GET    | `/api/beneficiaries`                        | Paginated owned list                        |
| GET    | `/api/beneficiaries/:beneficiaryId`         | Owned beneficiary details                   |
| PATCH  | `/api/beneficiaries/:beneficiaryId`         | Update nickname, relationship, or favourite |
| DELETE | `/api/beneficiaries/:beneficiaryId`         | Soft-remove an owned beneficiary            |
| PATCH  | `/api/beneficiaries/:beneficiaryId/restore` | Restore an inactive beneficiary             |
