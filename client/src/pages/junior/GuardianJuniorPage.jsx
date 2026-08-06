import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import { accountService } from '../../services/accountService';
import { juniorBankingService } from '../../services/juniorBankingService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits, maskAccountNumber, parseMajorUnitsToMinor } from '../../utils/money';

export default function GuardianJuniorPage() {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState('');
  const [controls, setControls] = useState(null);
  const [allowances, setAllowances] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [allowance, setAllowance] = useState({
    amount: '',
    frequency: 'weekly',
    sourceAccountId: '',
    nextRunAt: '',
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loadBase = useCallback(async () => {
    try {
      const [wards, pending, mine] = await Promise.all([
        juniorBankingService.guardianProfiles(),
        juniorBankingService.pendingApprovals(),
        accountService.getMine(),
      ]);
      setProfiles(wards.data.profiles);
      setApprovals(pending.data.requests);
      setAccounts(mine.data.accounts || []);
      if (!selected && wards.data.profiles[0]) setSelected(wards.data.profiles[0]._id);
    } catch (value) {
      setError(getApiError(value, 'Unable to load guardian tools'));
    }
  }, [selected]);
  useEffect(() => {
    loadBase();
  }, [loadBase]);
  useEffect(() => {
    if (!selected) return;
    Promise.all([
      juniorBankingService.controls(selected),
      juniorBankingService.allowances(selected),
    ])
      .then(([limits, scheduled]) => {
        setControls(limits.data);
        setAllowances(scheduled.data.allowances);
      })
      .catch((value) => setError(getApiError(value)));
  }, [selected]);
  const saveLimits = async () => {
    try {
      await juniorBankingService.updateControls(selected, controls);
      setNotice('Junior controls updated.');
    } catch (value) {
      setError(getApiError(value));
    }
  };
  const addAllowance = async (event) => {
    event.preventDefault();
    try {
      await juniorBankingService.createAllowance(selected, {
        sourceAccountId: allowance.sourceAccountId,
        amountMinor: parseMajorUnitsToMinor(allowance.amount),
        frequency: allowance.frequency,
        nextRunAt: allowance.nextRunAt,
      });
      setNotice('Allowance scheduled.');
      setAllowances((await juniorBankingService.allowances(selected)).data.allowances);
    } catch (value) {
      setError(getApiError(value, value.message));
    }
  };
  const review = async (id, decision) => {
    try {
      await juniorBankingService.review(id, decision);
      setNotice(`Request ${decision}d.`);
      await loadBase();
    } catch (value) {
      setError(getApiError(value));
    }
  };
  return (
    <div className="mx-auto max-w-7xl p-5 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-bank-700">
        Guardian controls
      </p>
      <h1 className="mt-2 text-3xl font-bold">Junior supervision</h1>
      {(error || notice) && (
        <div className="mt-5">
          <Alert type={error ? 'error' : 'success'}>{error || notice}</Alert>
        </div>
      )}
      <select
        className="mt-6 rounded-lg border p-3"
        aria-label="Junior profile"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Select junior</option>
        {profiles.map((item) => (
          <option key={item._id} value={item._id}>
            {item.juniorUser.firstName} {item.juniorUser.lastName}
          </option>
        ))}
      </select>
      {controls && (
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-xl font-semibold">Spending limits</h2>
            {[
              ['perTransactionLimitMinor', 'Per transaction'],
              ['dailyLimitMinor', 'Daily'],
              ['weeklyLimitMinor', 'Weekly'],
              ['monthlyLimitMinor', 'Monthly'],
            ].map(([key, label]) => (
              <label className="mt-3 block text-sm" key={key}>
                {label} (minor units)
                <input
                  className="mt-1 w-full rounded-lg border p-2"
                  type="number"
                  min="0"
                  step="1"
                  value={controls.spendingLimits[key]}
                  onChange={(e) =>
                    setControls({
                      ...controls,
                      spendingLimits: { ...controls.spendingLimits, [key]: Number(e.target.value) },
                    })
                  }
                />
              </label>
            ))}
            <label className="mt-4 flex gap-2">
              <input
                type="checkbox"
                checked={controls.permissions.canTransfer}
                onChange={(e) =>
                  setControls({
                    ...controls,
                    permissions: { ...controls.permissions, canTransfer: e.target.checked },
                  })
                }
              />
              Allow transfers
            </label>
            <button
              className="mt-4 rounded-lg bg-bank-700 px-4 py-2 font-semibold text-white"
              onClick={saveLimits}
            >
              Save controls
            </button>
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-xl font-semibold">Schedule allowance</h2>
            <form className="mt-3 grid gap-3" onSubmit={addAllowance}>
              <select
                className="rounded-lg border p-2"
                required
                value={allowance.sourceAccountId}
                onChange={(e) => setAllowance({ ...allowance, sourceAccountId: e.target.value })}
              >
                <option value="">Source account</option>
                {accounts
                  .filter((a) => a.status === 'active')
                  .map((a) => (
                    <option key={a._id} value={a._id}>
                      {maskAccountNumber(a.accountNumber)}
                    </option>
                  ))}
              </select>
              <input
                className="rounded-lg border p-2"
                placeholder="Amount"
                required
                value={allowance.amount}
                onChange={(e) => setAllowance({ ...allowance, amount: e.target.value })}
              />
              <select
                className="rounded-lg border p-2"
                value={allowance.frequency}
                onChange={(e) => setAllowance({ ...allowance, frequency: e.target.value })}
              >
                <option value="one_time">One time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <input
                className="rounded-lg border p-2"
                type="datetime-local"
                required
                value={allowance.nextRunAt}
                onChange={(e) => setAllowance({ ...allowance, nextRunAt: e.target.value })}
              />
              <button className="rounded-lg bg-bank-700 p-2 font-semibold text-white">
                Schedule
              </button>
            </form>
            {allowances.map((item) => (
              <p className="mt-3 text-sm" key={item._id}>
                {formatMinorUnits(item.amountMinor)} · {item.frequency} · {item.status}
              </p>
            ))}
          </section>
        </div>
      )}
      <section className="mt-7">
        <h2 className="text-xl font-semibold">Pending approvals</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {approvals.map((item) => (
            <article className="rounded-2xl border bg-white p-5" key={item._id}>
              <p className="font-bold">{formatMinorUnits(item.amountMinor)}</p>
              <p className="text-sm text-slate-600">
                {item.description || 'Junior transfer request'}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  className="rounded-lg bg-bank-700 px-3 py-2 text-white"
                  onClick={() => review(item._id, 'approve')}
                >
                  Approve
                </button>
                <button
                  className="rounded-lg border px-3 py-2"
                  onClick={() => review(item._id, 'reject')}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
          {!approvals.length && <p className="text-slate-600">No pending approvals.</p>}
        </div>
      </section>
    </div>
  );
}
