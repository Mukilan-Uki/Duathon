import { Link, Navigate, useLocation } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';
import { formatMinorUnits } from '../../utils/money';

export default function TransferResultPage() {
  const { state } = useLocation();
  const transaction = state?.transaction;
  if (!transaction) return <Navigate to="/transfer" replace />;

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
          Transfer result
        </p>
        <h1 className="mt-3 text-3xl font-bold">{state.message}</h1>
        <div className="mt-4"><StatusBadge status={transaction.status} /></div>
        <p className="mt-6 text-4xl font-bold">{formatMinorUnits(transaction.amount)}</p>
        <p className="mt-3 font-mono text-sm text-slate-600">{transaction.reference}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="rounded-lg bg-bank-700 px-4 py-2 font-semibold text-white" to={`/transactions/${transaction._id}`}>View transaction</Link>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" to="/transfer">Make another transfer</Link>
        </div>
      </section>
    </div>
  );
}
