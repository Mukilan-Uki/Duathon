import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from '../../components/common/Alert';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import StatusBadge from '../../components/common/StatusBadge';
import { beneficiaryService } from '../../services/beneficiaryService';
import { getApiError } from '../../utils/apiError';

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const load = useCallback(async () => {
    try {
      const response = await beneficiaryService.list();
      setBeneficiaries(response.data.beneficiaries);
    } catch (error) {
      setApiError(getApiError(error, 'Unable to load beneficiaries'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (values) => {
    setApiError('');
    setNotice('');
    try {
      const response = await beneficiaryService.add(values);
      setNotice(response.message);
      reset();
      await load();
    } catch (error) {
      setApiError(getApiError(error, 'Unable to save beneficiary'));
    }
  };

  const remove = async () => {
    setBusy(true);
    setApiError('');
    try {
      const response = await beneficiaryService.remove(removeTarget._id);
      setNotice(response.message);
      setRemoveTarget(null);
      await load();
    } catch (error) {
      setApiError(getApiError(error, 'Unable to remove beneficiary'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Saved recipients
      </p>
      <h1 className="mt-3 text-4xl font-bold">Beneficiaries</h1>
      <p className="mt-3 text-slate-600">Save validated Duothan accounts for faster transfers.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">Add beneficiary</h2>
          <form className="mt-5 space-y-5" onSubmit={handleSubmit(add)} noValidate>
            {notice && <Alert type="success">{notice}</Alert>}
            {apiError && <Alert>{apiError}</Alert>}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nickname</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
                maxLength="60"
                {...register('nickname', {
                  required: 'Nickname is required',
                  minLength: { value: 2, message: 'Use at least two characters' },
                })}
              />
              {errors.nickname && (
                <span className="mt-1 block text-sm text-red-700">{errors.nickname.message}</span>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Account number</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono"
                inputMode="numeric"
                maxLength="12"
                {...register('accountNumber', {
                  required: 'Account number is required',
                  pattern: { value: /^\d{12}$/, message: 'Enter a 12-digit account number' },
                })}
              />
              {errors.accountNumber && (
                <span className="mt-1 block text-sm text-red-700">
                  {errors.accountNumber.message}
                </span>
              )}
            </label>
            <button
              className="w-full rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Validating…' : 'Save beneficiary'}
            </button>
          </form>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="p-6">
            <h2 className="text-xl font-semibold">Saved beneficiaries</h2>
          </div>
          {loading ? (
            <p className="px-6 pb-6 text-slate-500">Loading beneficiaries…</p>
          ) : beneficiaries.length ? (
            <ul className="divide-y divide-slate-100">
              {beneficiaries.map((beneficiary) => (
                <li
                  className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center"
                  key={beneficiary._id}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{beneficiary.nickname}</h3>
                      <StatusBadge status={beneficiary.beneficiaryAccount?.status || 'closed'} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{beneficiary.accountName}</p>
                    <p className="mt-2 font-mono text-sm">{beneficiary.accountNumber}</p>
                  </div>
                  <button
                    className="self-start rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
                    onClick={() => setRemoveTarget(beneficiary)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 pb-8 text-slate-500">No saved beneficiaries yet.</p>
          )}
        </section>
      </div>
      <ConfirmationModal
        open={Boolean(removeTarget)}
        title="Remove beneficiary?"
        busy={busy}
        onCancel={() => !busy && setRemoveTarget(null)}
        onConfirm={remove}
      >
        {removeTarget && (
          <p>
            Remove <strong>{removeTarget.nickname}</strong>? This does not affect previous
            transactions.
          </p>
        )}
      </ConfirmationModal>
    </div>
  );
}
