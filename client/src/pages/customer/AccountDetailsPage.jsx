import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { accountService } from '../../services/accountService';
import { getApiError } from '../../utils/apiError';

export default function AccountDetailsPage() {
  const { accountId } = useParams();
  const [account, setAccount] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    accountService
      .getOne(accountId)
      .then((response) => setAccount(response.data.account))
      .catch((requestError) => setError(getApiError(requestError, 'Unable to load account')));
  }, [accountId]);

  if (error)
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Alert>{error}</Alert>
      </div>
    );
  if (!account)
    return <p className="mx-auto max-w-3xl px-5 py-10 text-slate-500">Loading account…</p>;

  const copyNumber = () =>
    account.accountNumber && navigator.clipboard.writeText(account.accountNumber);
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link className="text-sm font-semibold text-bank-700" to="/accounts">
        ← My accounts
      </Link>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold capitalize">{account.accountType} account</h1>
          <StatusBadge status={account.status} />
        </div>
        <dl className="mt-8 grid gap-6 sm:grid-cols-2">
          {[
            ['Account number', account.maskedAccountNumber],
            ['Branch', account.branchCode],
            ['Balance', account.balanceDisplay],
            ['Available balance', account.availableBalanceDisplay],
            ['Currency', account.currency],
            ['Created', new Date(account.createdAt).toLocaleDateString()],
            [
              'Approval',
              account.approvedAt ? new Date(account.approvedAt).toLocaleDateString() : 'Pending',
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="mt-1 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {account.accountNumber && (
          <button
            className="mt-7 rounded-lg border border-bank-700 px-4 py-2 font-semibold text-bank-700"
            onClick={copyNumber}
          >
            Copy account number
          </button>
        )}
      </div>
    </div>
  );
}
