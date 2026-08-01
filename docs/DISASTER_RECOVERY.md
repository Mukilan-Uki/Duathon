# Disaster Recovery

## Objectives

This prototype does not promise formal recovery objectives. Before production adoption, owners must approve an RPO and RTO, enable encrypted Atlas backups and point-in-time recovery, and test restoration in an isolated account.

## Backup strategy

- Use managed continuous MongoDB backups with retention appropriate to regulation.
- Protect deployment configuration and secrets in the provider secret manager; never place secrets in database backups or Git.
- Retain release artifacts and immutable commit/tag references.
- Export provider configuration and document DNS, email and CORS dependencies.

## Incident procedure

1. Stop affected writes or place the API in maintenance mode.
2. Preserve logs, audit records and the incident timeline.
3. Revoke exposed credentials, refresh sessions and device trust as appropriate.
4. Select the last verified application release and backup point.
5. Restore into an isolated environment and validate counts, balances and ledger relationships.
6. Reconcile financial records; never delete completed transactions to make balances match.
7. Promote only after security and business approval, then monitor health and error rates.
8. Notify affected parties according to applicable policy and law.

Run a restore exercise at least quarterly for a real service. Record duration, data loss, reconciliation findings and follow-up actions.
