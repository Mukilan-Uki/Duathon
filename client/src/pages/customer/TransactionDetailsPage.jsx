import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { transactionService } from '../../services/transactionService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

export default function TransactionDetailsPage() {
  const { transactionId } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [apiError, setApiError] = useState('');
  useEffect(() => {
    transactionService
      .details(transactionId)
      .then(({ data }) => setTransaction(data.transaction))
      .catch((error) => setApiError(getApiError(error)));
  }, [transactionId]);
  if (apiError)
    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Alert>{apiError}</Alert>
      </div>
    );
  if (!transaction)
    return <div className="p-12 text-center text-slate-500">Loading transaction…</div>;
  const rows = [
    ['Reference', transaction.reference],
    ['Transfer reference', transaction.transferReference],
    ['Date', new Date(transaction.createdAt).toLocaleString()],
    ['Direction', transaction.direction],
    ['Counterparty account', transaction.counterpartyAccountNumber],
    ['Description', transaction.description || '—'],
    ['Balance after', formatMinorUnits(transaction.balanceAfterMinor, transaction.currency)],
  ];
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link className="text-sm font-semibold text-bank-700" to="/transactions">
        ← Transaction history
      </Link>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Transaction amount</p>
            <h1 className="mt-2 text-3xl font-bold">
              {formatMinorUnits(transaction.amountMinor, transaction.currency)}
            </h1>
          </div>
          <StatusBadge status={transaction.status} />
        </div>
        <dl className="mt-8 space-y-4">
          {rows.map(([label, value]) => (
            <div
              className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 sm:flex-row"
              key={label}
            >
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="break-all text-sm font-medium capitalize">{value}</dd>
            </div>
          ))}
        </dl>
        <Link
          className="mt-7 inline-block rounded-lg bg-bank-700 px-5 py-2.5 font-semibold text-white"
          to={`/transactions/${transaction._id}/receipt`}
        >
          View printable receipt
        </Link>
      </section>
    </div>
  );
}
