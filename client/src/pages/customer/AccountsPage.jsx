import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { accountService } from '../../services/accountService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { accountType: 'savings', applicationNote: '' },
  });

  const load = useCallback(async () => {
    try {
      const response = await accountService.getMine();
      setAccounts(response.data.accounts);
    } catch (error) {
      setApiError(getApiError(error, 'Unable to load accounts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const apply = async (values) => {
    setApiError('');
    setNotice('');
    try {
      const response = await accountService.apply(values);
      setNotice(response.message);
      reset();
      await load();
    } catch (error) {
      setApiError(getApiError(error, 'Unable to submit application'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Customer banking
      </p>
      <h1 className="mt-3 text-4xl font-bold">Bank accounts</h1>
      <p className="mt-3 text-slate-600">Apply for an account and follow its approval status.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">New account application</h2>
          <form className="mt-5 space-y-5" onSubmit={handleSubmit(apply)}>
            {notice && <Alert type="success">{notice}</Alert>}
            {apiError && <Alert>{apiError}</Alert>}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Account type</span>
              <select
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
                {...register('accountType')}
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Application note (optional)
              </span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
                maxLength="500"
                {...register('applicationNote')}
              />
            </label>
            <button
              className="w-full rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="p-6">
            <h2 className="text-xl font-semibold">Your accounts</h2>
          </div>
          {loading ? (
            <p className="px-6 pb-6 text-slate-500">Loading accounts…</p>
          ) : accounts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3">Account</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Available balance</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr className="border-t border-slate-100" key={account._id}>
                      <td className="whitespace-nowrap px-6 py-4 font-mono">
                        {account.accountNumber}
                      </td>
                      <td className="px-6 py-4 capitalize">{account.accountType}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold">
                        {formatMinorUnits(account.availableBalanceMinor, account.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={account.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 pb-6 text-slate-500">No account applications yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
