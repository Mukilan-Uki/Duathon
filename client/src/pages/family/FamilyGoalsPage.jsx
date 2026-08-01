import { useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import FamilyPageHeader from '../../components/family/FamilyPageHeader';
import { useAuth } from '../../hooks/useAuth';
import { accountService } from '../../services/accountService';
import { familyService } from '../../services/familyService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits, parseMajorUnitsToMinor } from '../../utils/money';

export default function FamilyGoalsPage() {
  const { user } = useAuth();
  const [family, setFamily] = useState(null);
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', target: '', deadline: '' });
  const [contributions, setContributions] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const mine = await familyService.mine();
      const currentFamily = mine.data.family;
      setFamily(currentFamily);
      if (currentFamily) setGoals((await familyService.goals(currentFamily._id)).data.goals);
      setAccounts((await accountService.getMine()).data.accounts || []);
    } catch (value) {
      setError(getApiError(value, 'Unable to load savings goals'));
    }
  };
  useEffect(() => {
    load();
  }, []);
  const member = family?.members.find(
    (item) => String(item.user?._id || item.user) === String(user?._id),
  );
  const canCreate = member?.role === 'family_admin';
  const canContribute = canCreate || member?.permissions?.contributeToSharedGoals;
  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await familyService.createGoal(family._id, {
        title: form.title,
        description: form.description,
        targetAmountMinor: parseMajorUnitsToMinor(form.target),
        deadline: form.deadline || undefined,
      });
      setForm({ title: '', description: '', target: '', deadline: '' });
      setNotice('Savings goal created.');
      await load();
    } catch (value) {
      setError(getApiError(value, value.message || 'Unable to create goal'));
    } finally {
      setBusy(false);
    }
  };
  const contribute = async (goal) => {
    const entry = contributions[goal._id] || {};
    setBusy(true);
    setError('');
    try {
      await familyService.contribute(
        family._id,
        goal._id,
        {
          sourceAccountId: entry.accountId,
          amountMinor: parseMajorUnitsToMinor(entry.amount || ''),
        },
        crypto.randomUUID(),
      );
      setNotice('Contribution completed.');
      setContributions((all) => ({ ...all, [goal._id]: {} }));
      await load();
    } catch (value) {
      setError(getApiError(value, value.message || 'Unable to contribute'));
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (goal) => {
    setBusy(true);
    try {
      await familyService.cancelGoal(family._id, goal._id);
      setNotice('Goal cancelled.');
      await load();
    } catch (value) {
      setError(getApiError(value));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <FamilyPageHeader
        title="Shared savings goals"
        description="Contributions securely debit only the account you select."
      />
      {(error || notice) && (
        <div className="mt-6">
          <Alert type={error ? 'error' : 'success'}>{error || notice}</Alert>
        </div>
      )}
      {canCreate && (
        <form
          className="mt-8 grid gap-3 rounded-2xl border bg-white p-5 shadow-card md:grid-cols-2"
          onSubmit={create}
        >
          <h2 className="text-xl font-semibold md:col-span-2">Create goal</h2>
          <input
            className="rounded-lg border p-3"
            placeholder="Goal title"
            required
            minLength="3"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="rounded-lg border p-3"
            placeholder="Target amount"
            inputMode="decimal"
            required
            value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value })}
          />
          <textarea
            className="rounded-lg border p-3 md:col-span-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            className="rounded-lg border p-3"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
          <button className="rounded-lg bg-bank-700 p-3 font-semibold text-white" disabled={busy}>
            Create goal
          </button>
        </form>
      )}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {goals.map((goal) => {
          const entry = contributions[goal._id] || {};
          const remaining = Math.max(0, goal.targetAmountMinor - goal.currentAmountMinor);
          return (
            <article className="rounded-2xl border bg-white p-5 shadow-card" key={goal._id}>
              <div className="flex justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{goal.title}</h2>
                  <p className="text-sm text-slate-600">{goal.description}</p>
                </div>
                <span className="text-sm capitalize">{goal.status}</span>
              </div>
              <p className="mt-4 text-lg font-bold">
                {formatMinorUnits(goal.currentAmountMinor, goal.currency)} /{' '}
                {formatMinorUnits(goal.targetAmountMinor, goal.currency)}
              </p>
              <p className="text-xs text-slate-500">
                Remaining {formatMinorUnits(remaining, goal.currency)}
              </p>
              {canContribute && goal.status === 'active' && (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <select
                    aria-label="Source account"
                    className="rounded-lg border p-2"
                    value={entry.accountId || ''}
                    onChange={(e) =>
                      setContributions((all) => ({
                        ...all,
                        [goal._id]: { ...entry, accountId: e.target.value },
                      }))
                    }
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter((a) => a.status === 'active')
                      .map((a) => (
                        <option value={a._id} key={a._id}>
                          {a.accountNumber}
                        </option>
                      ))}
                  </select>
                  <input
                    aria-label="Contribution amount"
                    className="rounded-lg border p-2"
                    placeholder="Amount"
                    value={entry.amount || ''}
                    onChange={(e) =>
                      setContributions((all) => ({
                        ...all,
                        [goal._id]: { ...entry, amount: e.target.value },
                      }))
                    }
                  />
                  <button
                    className="rounded-lg bg-bank-700 p-2 font-semibold text-white"
                    disabled={busy || !entry.accountId || !entry.amount}
                    onClick={() => contribute(goal)}
                  >
                    Contribute
                  </button>
                </div>
              )}
              {canCreate && goal.status === 'active' && (
                <button
                  className="mt-4 text-sm font-semibold text-red-700"
                  disabled={busy}
                  onClick={() => cancel(goal)}
                >
                  Cancel goal
                </button>
              )}
            </article>
          );
        })}
        {!goals.length && <p className="text-slate-600">No shared savings goals yet.</p>}
      </div>
    </div>
  );
}
