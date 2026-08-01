# Family Banking

Family Banking provides explicit, server-enforced membership permissions without granting access
to another adult's accounts or balances. A verified, active adult customer may create one active
family. The creator becomes `family_admin`; adult invitations expire after the configured period.

Family membership and invitation history are retained through lifecycle statuses rather than hard
deletion. Junior roles are reserved for the later Junior Banking workflow and cannot be assigned
through adult member APIs.

Shared goal contributions accept integer LKR minor units and an `Idempotency-Key`. The service
revalidates active family membership, contribution permission, source-account ownership, available
balance, and remaining goal amount inside a MongoDB transaction. It atomically debits the owned
account, updates the goal, writes an immutable contribution and financial transaction, and creates
audit and notification records.

No adult balance is included in family responses. The `shareAdultBalances` setting is a disabled
foundation only; balance sharing will require a separate explicit-consent design.
