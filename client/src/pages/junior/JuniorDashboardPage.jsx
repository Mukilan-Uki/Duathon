import { useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import { juniorBankingService } from '../../services/juniorBankingService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits, parseMajorUnitsToMinor } from '../../utils/money';

export default function JuniorDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [goal, setGoal] = useState({ title: '', target: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = () =>
    juniorBankingService
      .dashboard()
      .then(({ data }) => setDashboard(data))
      .catch((value) =>
        setError(getApiError(value, 'Junior Banking is not active for this account')),
      );
  useEffect(() => {
    load();
  }, []);
  const createGoal = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await juniorBankingService.createGoal({
        title: goal.title,
        targetAmountMinor: parseMajorUnitsToMinor(goal.target),
      });
      setGoal({ title: '', target: '' });
      setNotice('Savings goal created.');
      await load();
    } catch (value) {
      setError(getApiError(value, value.message));
    }
  };
  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-bank-700">
        Junior Banking
      </p>
      <h1 className="mt-2 text-3xl font-bold">My money</h1>
      <p className="mt-2 text-slate-600">A simple, supervised view of your account and goals.</p>
      {(error || notice) && (
        <div className="mt-5">
          <Alert type={error ? 'error' : 'success'}>{error || notice}</Alert>
        </div>
      )}
      {dashboard && (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl bg-bank-700 p-6 text-white">
              <p className="text-sm opacity-80">Available balance</p>
              <p className="mt-2 text-3xl font-bold">
                {formatMinorUnits(dashboard.account?.availableBalanceMinor || 0)}
              </p>
            </article>
            <article className="rounded-2xl border bg-white p-6">
              <p className="text-sm text-slate-500">Per transfer limit</p>
              <p className="mt-2 text-2xl font-bold">
                {formatMinorUnits(dashboard.profile.spendingLimits.perTransactionLimitMinor)}
              </p>
            </article>
            <article className="rounded-2xl border bg-white p-6">
              <p className="text-sm text-slate-500">Next allowance</p>
              <p className="mt-2 text-xl font-bold">
                {dashboard.allowances[0]
                  ? formatMinorUnits(dashboard.allowances[0].amountMinor)
                  : 'Not scheduled'}
              </p>
            </article>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="text-xl font-semibold">Savings goals</h2>
              <form
                className="mt-3 grid gap-2 rounded-2xl border bg-white p-4 sm:grid-cols-3"
                onSubmit={createGoal}
              >
                <input
                  className="rounded-lg border p-2"
                  placeholder="Goal name"
                  required
                  value={goal.title}
                  onChange={(e) => setGoal({ ...goal, title: e.target.value })}
                />
                <input
                  className="rounded-lg border p-2"
                  placeholder="Target amount"
                  required
                  value={goal.target}
                  onChange={(e) => setGoal({ ...goal, target: e.target.value })}
                />
                <button className="rounded-lg bg-bank-700 p-2 font-semibold text-white">
                  Create
                </button>
              </form>
              <div className="mt-3 space-y-3">
                {dashboard.goals.map((item) => (
                  <article className="rounded-xl border bg-white p-4" key={item._id}>
                    <div className="flex justify-between">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="text-sm capitalize">{item.status}</span>
                    </div>
                    <p className="mt-2">
                      {formatMinorUnits(item.currentAmountMinor)} of{' '}
                      {formatMinorUnits(item.targetAmountMinor)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-xl font-semibold">Recent requests</h2>
              <div className="mt-3 space-y-3">
                {dashboard.requests.map((item) => (
                  <article className="rounded-xl border bg-white p-4" key={item._id}>
                    <div className="flex justify-between">
                      <span>{formatMinorUnits(item.amountMinor)}</span>
                      <span className="capitalize">{item.status}</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {item.description || 'Transfer request'}
                    </p>
                  </article>
                ))}
              </div>
              <h2 className="mt-7 text-xl font-semibold">Money tips</h2>
              <ul className="mt-3 space-y-2">
                {dashboard.educationTips.map((tip) => (
                  <li className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900" key={tip}>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
