import { Banknote, Landmark, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Alert from '../../components/common/Alert';
import SummaryCard from '../../components/dashboard/SummaryCard';
import DashboardLayout from '../../layouts/DashboardLayout';
import { dashboardService } from '../../services/dashboardService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

const COLORS = ['#087f6b', '#2563eb', '#7c3aed'];

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    dashboardService
      .admin()
      .then(setDashboard)
      .catch((error) => setApiError(getApiError(error, 'Unable to load dashboard')));
  }, []);

  if (apiError || !dashboard) {
    return (
      <DashboardLayout role="admin">
        {apiError ? <Alert>{apiError}</Alert> : <p>Loading administration dashboard…</p>}
      </DashboardLayout>
    );
  }

  const trend = dashboard.transactionTrend.map((item) => ({
    ...item,
    value: item.valueMinor / 100,
  }));

  return (
    <DashboardLayout role="admin">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Administrator dashboard
      </p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Bank-wide overview</h1>
      <p className="mt-2 text-slate-600">
        A consolidated view of users, accounts, and transfer activity.
      </p>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total users"
          value={dashboard.summary.totalUsers}
          detail={`${dashboard.summary.totalCustomers} customers`}
          icon={Users}
        />
        <SummaryCard label="Accounts" value={dashboard.summary.totalAccounts} icon={Landmark} />
        <SummaryCard
          label="Transaction records"
          value={dashboard.summary.totalTransactions}
          detail={`${dashboard.summary.pendingLoans} loans pending · ${dashboard.summary.suspiciousActivities} investigations`}
          icon={ShieldCheck}
        />
        <SummaryCard
          label="Transferred value"
          value={formatMinorUnits(dashboard.summary.transferredValueMinor)}
          icon={Banknote}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold">Six-month transfer trend</h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'value' ? `LKR ${Number(value).toLocaleString()}` : value
                  }
                />
                <Legend />
                <Bar dataKey="count" name="Transfers" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="value" name="Value (LKR)" fill="#087f6b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold">Users by role</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.usersByRole}
                  dataKey="count"
                  nameKey="role"
                  innerRadius={55}
                  outerRadius={90}
                >
                  {dashboard.usersByRole.map((item, index) => (
                    <Cell key={item.role} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
