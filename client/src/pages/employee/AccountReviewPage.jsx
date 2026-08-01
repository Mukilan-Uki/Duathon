import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import StatusBadge from '../../components/common/StatusBadge';
import { accountService } from '../../services/accountService';
import { getApiError } from '../../utils/apiError';

export default function AccountReviewPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const response =
        status === 'pending' && !search
          ? await accountService.getPending()
          : await accountService.search({ search, status: status || undefined });
      setAccounts(response.data.accounts);
    } catch (error) {
      setApiError(getApiError(error, 'Unable to load accounts'));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const perform = async () => {
    if (['reject', 'suspend', 'close'].includes(action.type) && reason.trim().length < 3) {
      setApiError('Enter a reason of at least three characters');
      return;
    }
    setBusy(true);
    setApiError('');
    try {
      const response =
        action.type === 'approve'
          ? await accountService.approve(action.account._id)
          : await accountService[action.type](action.account._id, reason.trim());
      setNotice(response.message);
      setAction(null);
      setReason('');
      await load();
    } catch (error) {
      setApiError(getApiError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Staff operations
      </p>
      <h1 className="mt-3 text-4xl font-bold">Account management</h1>
      <p className="mt-3 text-slate-600">
        Review applications and manage account status. Every decision is audited.
      </p>

      <form
        className="mt-7 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <label>
          <span className="sr-only">Search accounts</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Account number or branch"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Account status</span>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <button className="rounded-lg bg-bank-700 px-4 py-2 font-semibold text-white">
          Search
        </button>
      </form>

      {notice && (
        <div className="mt-5">
          <Alert type="success">{notice}</Alert>
        </div>
      )}
      {apiError && (
        <div className="mt-5">
          <Alert>{apiError}</Alert>
        </div>
      )}
      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="text-slate-500">Loading accounts…</p>
        ) : accounts.length ? (
          accounts.map((account) => {
            const customer = account.user;
            return (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
                key={account._id}
              >
                <div className="flex flex-col justify-between gap-5 lg:flex-row">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold">
                        {customer?.firstName} {customer?.lastName}
                      </h2>
                      <StatusBadge status={account.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{customer?.email}</p>
                    <p className="mt-3 font-mono text-sm">
                      {account.maskedAccountNumber} ·{' '}
                      <span className="capitalize">{account.accountType}</span> ·{' '}
                      {account.branchCode}
                    </p>
                    {account.suspensionReason && (
                      <p className="mt-2 text-sm text-red-700">
                        Reason: {account.suspensionReason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {account.status === 'pending' && (
                      <>
                        <button
                          className="rounded-lg bg-bank-700 px-4 py-2 font-semibold text-white"
                          onClick={() => setAction({ type: 'approve', account })}
                        >
                          Approve
                        </button>
                        <button
                          className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700"
                          onClick={() => setAction({ type: 'reject', account })}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {account.status === 'active' && (
                      <button
                        className="rounded-lg border border-amber-400 px-4 py-2 font-semibold text-amber-800"
                        onClick={() => setAction({ type: 'suspend', account })}
                      >
                        Suspend
                      </button>
                    )}
                    {account.status === 'suspended' && (
                      <button
                        className="rounded-lg border border-bank-700 px-4 py-2 font-semibold text-bank-700"
                        onClick={() => setAction({ type: 'reactivate', account })}
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No matching accounts.
          </div>
        )}
      </div>

      <ConfirmationModal
        open={Boolean(action)}
        title={`${action?.type || ''} account`}
        busy={busy}
        confirmLabel="Confirm action"
        onCancel={() => {
          setAction(null);
          setReason('');
        }}
        onConfirm={perform}
      >
        <p>
          This status change will be recorded in the audit log and the customer will be notified.
        </p>
        {action && ['reject', 'suspend', 'close'].includes(action.type) && (
          <label className="mt-4 block">
            <span className="font-medium">Reason</span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3"
              maxLength="500"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        )}
      </ConfirmationModal>
    </div>
  );
}
