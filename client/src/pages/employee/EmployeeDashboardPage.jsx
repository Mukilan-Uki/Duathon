import { Activity, CircleAlert, Clock3, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import SummaryCard from '../../components/dashboard/SummaryCard';
import DashboardLayout from '../../layouts/DashboardLayout';
import { dashboardService } from '../../services/dashboardService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

const COLORS = ['#087f6b', '#f59e0b', '#64748b', '#dc2626'];

export default function EmployeeDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    dashboardService
      .employee()
      .then(setDashboard)
      .catch((error) => setApiError(getApiError(error, 'Unable to load dashboard')));
  }, []);

  if (apiError || !dashboard) {
    return (
      <DashboardLayout role="employee">
        {apiError ? <Alert>{apiError}</Alert> : <p>Loading operations dashboard…</p>}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="employee">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Employee dashboard
      </p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Operations overview</h1>
      <p className="mt-2 text-slate-600">Review workloads and recent banking activity.</p>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Assigned customers"
          value={dashboard.summary.assignedCustomers}
          icon={Users}
        />
        <SummaryCard
          label="Pending accounts"
          value={dashboard.summary.pendingAccounts}
          icon={Clock3}
        />
        <SummaryCard label="Pending loans" value={dashboard.summary.pendingLoans} icon={Activity} />
        <SummaryCard
          label="Attention items"
          value={dashboard.summary.attentionItems}
          detail={`${dashboard.summary.transactionsLast24Hours} transaction records in 24 hours`}
          icon={CircleAlert}
        />
      </section>
      <p className="mt-4 text-sm text-slate-600">
        {dashboard.summary.openInvestigations} open or active investigations.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold">Accounts by status</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.accountStatuses}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={55}
                  outerRadius={90}
                >
                  {dashboard.accountStatuses.map((item, index) => (
                    <Cell key={item.status} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="p-5">
            <h2 className="text-lg font-semibold">High-value activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent completed transfers near the configured limit.
            </p>
          </div>
          {dashboard.highValueActivity.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.highValueActivity.map((transaction) => (
                    <tr className="border-t border-slate-100" key={transaction._id}>
                      <td className="px-5 py-4">
                        {transaction.owner
                          ? `${transaction.owner.firstName} ${transaction.owner.lastName}`
                          : 'Unknown'}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">
                        {transaction.transferReference}
                      </td>
                      <td className="px-5 py-4 font-semibold">
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
            <p className="px-5 pb-6 text-sm text-slate-500">
              No high-value activity requires review.
            </p>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
