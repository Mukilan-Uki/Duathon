import { ArrowDownLeft, ArrowUpRight, CreditCard, Landmark, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import SummaryCard from '../../components/dashboard/SummaryCard';
import { useAuth } from '../../hooks/useAuth';
import DashboardLayout from '../../layouts/DashboardLayout';
import { dashboardService } from '../../services/dashboardService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    dashboardService
      .customer()
      .then(setDashboard)
      .catch((error) => setApiError(getApiError(error, 'Unable to load dashboard')));
  }, []);

  if (apiError) {
    return (
      <DashboardLayout role="customer">
        <Alert>{apiError}</Alert>
      </DashboardLayout>
    );
  }
  if (!dashboard) {
    return (
      <DashboardLayout role="customer">
        <p className="text-slate-500">Loading your banking overview…</p>
      </DashboardLayout>
    );
  }

  const chartData = dashboard.cashFlow.map((item) => ({
    month: item.month,
    Sent: item.sentMinor / 100,
    Received: item.receivedMinor / 100,
  }));

  return (
    <DashboardLayout role="customer">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Customer dashboard
      </p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome, {user.firstName}</h1>
      <p className="mt-2 text-slate-600">Here is your current financial overview.</p>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Available balance"
          value={formatMinorUnits(dashboard.summary.availableBalanceMinor)}
          detail={`${dashboard.summary.activeAccounts} active accounts`}
          icon={Landmark}
        />
        <SummaryCard
          label="Money sent"
          value={formatMinorUnits(dashboard.summary.sentMinor)}
          icon={ArrowUpRight}
        />
        <SummaryCard
          label="Money received"
          value={formatMinorUnits(dashboard.summary.receivedMinor)}
          icon={ArrowDownLeft}
        />
        <SummaryCard
          label="Outstanding loans"
          value={formatMinorUnits(dashboard.summary.outstandingLoansMinor)}
          detail={`${dashboard.summary.activeLoans} active loans`}
          icon={WalletCards}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold">Six-month cash flow</h2>
          <div className="mt-5 h-72" aria-label="Cash flow chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `LKR ${Number(value).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Received" fill="#087f6b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sent" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Accounts</h2>
            <CreditCard size={20} className="text-bank-700" aria-hidden="true" />
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.accounts.length ? (
              dashboard.accounts.map((account) => (
                <div className="rounded-xl bg-slate-50 p-4" key={account._id}>
                  <div className="flex justify-between gap-3">
                    <p className="font-medium capitalize">{account.accountType}</p>
                    <StatusBadge status={account.status} />
                  </div>
                  <p className="mt-2 font-mono text-xs">{account.accountNumber}</p>
                  <p className="mt-2 font-semibold">
                    {formatMinorUnits(account.availableBalanceMinor, account.currency)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No accounts yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="p-5">
          <h2 className="text-lg font-semibold">Recent transactions</h2>
        </div>
        {dashboard.recentTransactions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentTransactions.map((transaction) => (
                  <tr className="border-t border-slate-100" key={transaction._id}>
                    <td className="whitespace-nowrap px-5 py-4">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">{transaction.transferReference}</td>
                    <td className="px-5 py-4">{transaction.description || transaction.type}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold">
                      {transaction.direction === 'sent' || transaction.direction === 'debit'
                        ? '−'
                        : '+'}
                      {formatMinorUnits(transaction.amountMinor, transaction.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={transaction.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 pb-6 text-sm text-slate-500">No transactions yet.</p>
        )}
      </section>
    </DashboardLayout>
  );
}
