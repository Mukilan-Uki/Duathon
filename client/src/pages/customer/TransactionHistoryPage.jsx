import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { transactionService } from '../../services/transactionService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

const initialFilters = { search: '', direction: '', status: '', dateFrom: '', dateTo: '' };

export default function TransactionHistoryPage() {
  const [formFilters, setFormFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setApiError('');
      try {
        const params = { ...filters, page, limit: 10 };
        Object.keys(params).forEach((key) => params[key] === '' && delete params[key]);
        const response = await transactionService.history(params);
        setTransactions(response.data.transactions);
        setPagination(response.data.pagination);
      } catch (error) {
        setApiError(getApiError(error, 'Unable to load transaction history'));
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters(formFilters);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Account activity
      </p>
      <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-4xl font-bold">Transactions</h1>
          <p className="mt-3 text-slate-600">{pagination.total} matching records</p>
        </div>
        <Link
          className="rounded-lg bg-bank-700 px-5 py-2.5 text-center font-semibold text-white"
          to="/transfer"
        >
          Send money
        </Link>
      </div>

      <form
        className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:grid-cols-6"
        onSubmit={applyFilters}
      >
        <input
          aria-label="Search transactions"
          className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
          placeholder="Search reference, description…"
          value={formFilters.search}
          onChange={(event) =>
            setFormFilters((current) => ({ ...current, search: event.target.value }))
          }
        />
        <select
          aria-label="Direction"
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={formFilters.direction}
          onChange={(event) =>
            setFormFilters((current) => ({ ...current, direction: event.target.value }))
          }
        >
          <option value="">All directions</option>
          <option value="sent">Sent</option>
          <option value="received">Received</option>
        </select>
        <select
          aria-label="Status"
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={formFilters.status}
          onChange={(event) =>
            setFormFilters((current) => ({ ...current, status: event.target.value }))
          }
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="reversed">Reversed</option>
        </select>
        <input
          aria-label="From date"
          className="rounded-lg border border-slate-300 px-3 py-2"
          type="date"
          value={formFilters.dateFrom}
          onChange={(event) =>
            setFormFilters((current) => ({ ...current, dateFrom: event.target.value }))
          }
        />
        <input
          aria-label="To date"
          className="rounded-lg border border-slate-300 px-3 py-2"
          type="date"
          value={formFilters.dateTo}
          onChange={(event) =>
            setFormFilters((current) => ({ ...current, dateTo: event.target.value }))
          }
        />
        <button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white md:col-start-6">
          Apply filters
        </button>
      </form>

      {apiError && (
        <div className="mt-6">
          <Alert>{apiError}</Alert>
        </div>
      )}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        {loading ? (
          <p className="p-6 text-slate-500">Loading transactions…</p>
        ) : transactions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Counterparty</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr className="border-t border-slate-100" key={transaction._id}>
                    <td className="whitespace-nowrap px-5 py-4">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">{transaction.transferReference}</td>
                    <td className="px-5 py-4 font-mono">{transaction.counterpartyAccountNumber}</td>
                    <td
                      className={`whitespace-nowrap px-5 py-4 font-semibold ${transaction.direction === 'sent' ? 'text-red-700' : 'text-emerald-700'}`}
                    >
                      {transaction.direction === 'sent' ? '−' : '+'}
                      {formatMinorUnits(transaction.amountMinor, transaction.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        className="font-semibold text-bank-700"
                        to={`/transactions/${transaction._id}`}
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-slate-500">No transactions match these filters.</p>
        )}
      </section>
      <div className="mt-5 flex items-center justify-between">
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40"
          disabled={pagination.page <= 1}
          onClick={() => load(pagination.page - 1)}
        >
          Previous
        </button>
        <span className="text-sm text-slate-600">
          Page {pagination.page} of {pagination.pages}
        </span>
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40"
          disabled={pagination.page >= pagination.pages}
          onClick={() => load(pagination.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
