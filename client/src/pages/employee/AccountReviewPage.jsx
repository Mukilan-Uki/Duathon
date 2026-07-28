import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { accountService } from '../../services/accountService';
import { getApiError } from '../../utils/apiError';

export default function AccountReviewPage() {
  const [accounts, setAccounts] = useState([]);
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState('');
  const [apiError, setApiError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await accountService.getPending();
      setAccounts(response.data.accounts);
    } catch (error) {
      setApiError(getApiError(error, 'Unable to load pending accounts'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (accountId, decision) => {
    const reviewNote = notes[accountId]?.trim();
    if (!reviewNote || reviewNote.length < 3) {
      setApiError('Enter a review note of at least three characters');
      return;
    }
    setBusyId(accountId);
    setApiError('');
    try {
      await accountService.review(accountId, { decision, reviewNote });
      await load();
    } catch (error) {
      setApiError(getApiError(error));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Staff operations
      </p>
      <h1 className="mt-3 text-4xl font-bold">Account applications</h1>
      <p className="mt-3 text-slate-600">
        Review pending customer applications. Every decision is audited.
      </p>
      {apiError && (
        <div className="mt-6">
          <Alert>{apiError}</Alert>
        </div>
      )}
      <div className="mt-8 space-y-4">
        {accounts.length ? (
          accounts.map((account) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
              key={account._id}
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">
                      {account.owner.firstName} {account.owner.lastName}
                    </h2>
                    <StatusBadge status={account.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{account.owner.email}</p>
                  <p className="mt-4 font-mono text-sm">
                    {account.accountNumber} ·{' '}
                    <span className="capitalize">{account.accountType}</span>
                  </p>
                  {account.applicationNote && (
                    <p className="mt-3 text-sm text-slate-600">{account.applicationNote}</p>
                  )}
                </div>
                <div className="w-full md:max-w-md">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor={`note-${account._id}`}
                  >
                    Review note
                  </label>
                  <textarea
                    id={`note-${account._id}`}
                    className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2"
                    maxLength="500"
                    value={notes[account._id] || ''}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [account._id]: event.target.value }))
                    }
                  />
                  <div className="mt-3 flex gap-3">
                    <button
                      className="rounded-lg bg-bank-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
                      disabled={busyId === account._id}
                      onClick={() => review(account._id, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:opacity-60"
                      disabled={busyId === account._id}
                      onClick={() => review(account._id, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No pending applications.
          </div>
        )}
      </div>
    </div>
  );
}
