import { useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import DashboardLayout from '../../layouts/DashboardLayout';
import { operationsService } from '../../services/operationsService';
import { transactionService } from '../../services/transactionService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

export default function TransactionMonitoringPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [investigationNote, setInvestigationNote] = useState('');
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
  useEffect(() => {
    load();
  }, []);

  const flag = async (event) => {
    event.preventDefault();
    try {
      await operationsService.flag(selectedTransaction, flagReason);
      setSelectedTransaction('');
      setFlagReason('');
      load();
    } catch (value) {
      setError(getApiError(value));
    }
  };

  const investigate = async (event) => {
    event.preventDefault();
    try {
      await operationsService.investigate(selectedActivity, {
        status: 'investigating',
        note: investigationNote,
      });
      setSelectedActivity('');
      setInvestigationNote('');
      load();
    } catch (value) {
      setError(getApiError(value));
    }
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
      {selectedTransaction && (
        <form className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5" onSubmit={flag}>
          <label className="block font-semibold" htmlFor="flag-reason">
            Investigation reason
          </label>
          <textarea
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3"
            id="flag-reason"
            minLength="10"
            maxLength="500"
            required
            value={flagReason}
            onChange={(event) => setFlagReason(event.target.value)}
          />
          <div className="mt-3 flex gap-3">
            <button className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white">
              Submit flag
            </button>
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold"
              type="button"
              onClick={() => setSelectedTransaction('')}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <section className="mt-7 overflow-x-auto rounded-2xl border bg-white shadow-card">
        <h2 className="p-5 text-lg font-semibold">Recent transactions</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3" scope="col">
                Reference
              </th>
              <th className="px-5 py-3" scope="col">
                Customer
              </th>
              <th className="px-5 py-3" scope="col">
                Amount
              </th>
              <th className="px-5 py-3" scope="col">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => (
              <tr className="border-t" key={item._id}>
                <td className="px-5 py-4 font-mono text-xs">{item.transferReference}</td>
                <td className="px-5 py-4">{item.owner?.email || 'Unknown'}</td>
                <td className="px-5 py-4">{formatMinorUnits(item.amountMinor, item.currency)}</td>
                <td className="px-5 py-4">
                  <button
                    className="font-semibold text-red-700"
                    type="button"
                    onClick={() => setSelectedTransaction(item._id)}
                  >
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
            {selectedActivity === item._id ? (
              <form className="mt-4" onSubmit={investigate}>
                <label className="text-sm font-semibold" htmlFor={`note-${item._id}`}>
                  Investigation note
                </label>
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-300 p-3"
                  id={`note-${item._id}`}
                  minLength="3"
                  maxLength="1000"
                  required
                  value={investigationNote}
                  onChange={(event) => setInvestigationNote(event.target.value)}
                />
                <button className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Save note
                </button>
              </form>
            ) : (
              <button
                className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={() => setSelectedActivity(item._id)}
              >
                Add note
              </button>
            )}
          </article>
        ))}
      </section>
    </DashboardLayout>
  );
}
