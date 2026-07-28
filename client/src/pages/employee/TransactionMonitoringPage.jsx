import { useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { operationsService } from '../../services/operationsService';
import { transactionService } from '../../services/transactionService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

export default function TransactionMonitoringPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');
  const load = () =>
    Promise.all([
      transactionService.monitor({ page: 1, limit: 20 }),
      operationsService.suspicious(),
    ])
      .then(([transactionResult, activityResult]) => {
        setTransactions(transactionResult.transactions);
        setActivities(activityResult.activities);
      })
      .catch((value) => setError(getApiError(value)));
  useEffect(load, []);

  const flag = async (id) => {
    const reason = window.prompt('Why should this transaction be investigated?');
    if (!reason) return;
    try {
      await operationsService.flag(id, reason);
      load();
    } catch (value) {
      setError(getApiError(value));
    }
  };
  const investigate = async (id) => {
    const note = window.prompt('Add an investigation note');
    if (!note) return;
    await operationsService.investigate(id, { status: 'investigating', note });
    load();
  };

  return (
    <DashboardLayout role={user.role}>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Risk operations
      </p>
      <h1 className="mt-2 text-3xl font-bold">Transaction monitoring</h1>
      {error && (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      )}
      <section className="mt-7 overflow-x-auto rounded-2xl border bg-white shadow-card">
        <h2 className="p-5 text-lg font-semibold">Recent transactions</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3">Reference</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => (
              <tr className="border-t" key={item._id}>
                <td className="px-5 py-4 font-mono text-xs">{item.transferReference}</td>
                <td className="px-5 py-4">{item.owner?.email || 'Unknown'}</td>
                <td className="px-5 py-4">{formatMinorUnits(item.amountMinor, item.currency)}</td>
                <td className="px-5 py-4">
                  <button className="font-semibold text-red-700" onClick={() => flag(item._id)}>
                    Flag
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold">Investigation queue</h2>
        {activities.map((item) => (
          <article className="rounded-2xl border bg-white p-5 shadow-card" key={item._id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-semibold">{item.customer?.email}</p>
                <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {item.notes.length} investigation notes · {item.source}
            </p>
            <button
              className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => investigate(item._id)}
            >
              Add note
            </button>
          </article>
        ))}
      </section>
    </DashboardLayout>
  );
}
