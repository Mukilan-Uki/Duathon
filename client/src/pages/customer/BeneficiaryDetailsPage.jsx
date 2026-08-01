import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import StatusBadge from '../../components/common/StatusBadge';
import { beneficiaryService } from '../../services/beneficiaryService';
import { getApiError } from '../../utils/apiError';

function formatDate(value, fallback = 'Never') {
  return value
    ? new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : fallback;
}

export default function BeneficiaryDetailsPage() {
  const { beneficiaryId } = useParams();
  const [beneficiary, setBeneficiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const loadRequestRef = useRef(0);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { nickname: '', relationship: 'other', isFavourite: false },
  });

  const applyBeneficiary = useCallback(
    (value) => {
      setBeneficiary(value);
      reset({
        nickname: value.nickname,
        relationship: value.relationship,
        isFavourite: value.isFavourite,
      });
    },
    [reset],
  );

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setApiError('');
    setBeneficiary(null);
    try {
      const response = await beneficiaryService.get(beneficiaryId);
      if (requestId !== loadRequestRef.current) return;
      applyBeneficiary(response.data.beneficiary);
    } catch (error) {
      if (requestId !== loadRequestRef.current) return;
      setApiError(getApiError(error, 'Unable to load beneficiary details'));
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [applyBeneficiary, beneficiaryId]);

  useEffect(() => {
    load();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [load]);

  const update = async (values) => {
    setApiError('');
    setNotice('');
    try {
      const response = await beneficiaryService.update(beneficiaryId, {
        nickname: values.nickname,
        relationship: values.relationship,
        isFavourite: Boolean(values.isFavourite),
      });
      applyBeneficiary(response.data.beneficiary);
      setNotice(response.message);
    } catch (error) {
      setApiError(getApiError(error, 'Unable to update beneficiary'));
    }
  };

  const remove = async () => {
    setBusyAction('remove');
    setApiError('');
    setNotice('');
    try {
      const response = await beneficiaryService.remove(beneficiaryId);
      setNotice(response.message);
      setRemoveOpen(false);
      await load();
    } catch (error) {
      setApiError(getApiError(error, 'Unable to remove beneficiary'));
    } finally {
      setBusyAction('');
    }
  };

  const restore = async () => {
    setBusyAction('restore');
    setApiError('');
    setNotice('');
    try {
      const response = await beneficiaryService.restore(beneficiaryId);
      applyBeneficiary(response.data.beneficiary);
      setNotice(response.message);
    } catch (error) {
      setApiError(getApiError(error, 'Unable to restore beneficiary'));
    } finally {
      setBusyAction('');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 text-slate-600 sm:px-8" role="status">
        Loading beneficiary details…
      </div>
    );
  }

  if (!beneficiary) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <Alert>{apiError || 'Beneficiary not found'}</Alert>
        <Link className="mt-5 inline-flex font-semibold text-bank-700" to="/beneficiaries">
          Return to beneficiaries
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-bank-700"
        to="/beneficiaries"
      >
        <ArrowLeft size={17} aria-hidden="true" /> Back to beneficiaries
      </Link>

      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
            Saved beneficiary
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold">{beneficiary.nickname}</h1>
            {beneficiary.isFavourite && (
              <Star
                className="text-amber-600"
                size={24}
                fill="currentColor"
                aria-label="Favourite"
              />
            )}
          </div>
        </div>
        {beneficiary.status === 'active' && beneficiary.available && (
          <Link
            className="rounded-lg bg-bank-700 px-5 py-2.5 text-center font-semibold text-white"
            to={`/transfer?beneficiaryId=${beneficiary._id}`}
          >
            Send money
          </Link>
        )}
      </div>

      {notice && (
        <div className="mt-6">
          <Alert type="success">{notice}</Alert>
        </div>
      )}
      {apiError && (
        <div className="mt-6">
          <Alert>{apiError}</Alert>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={beneficiary.status} />
            <StatusBadge status={beneficiary.available ? 'available' : 'unavailable'} />
          </div>
          {!beneficiary.available && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Transfers are unavailable</p>
              <p className="mt-1">
                {beneficiary.unavailableReason || 'This account cannot receive transfers.'}
              </p>
            </div>
          )}
          <dl className="mt-6 divide-y divide-slate-100 text-sm">
            <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
              <dt className="font-medium text-slate-500">Account holder</dt>
              <dd>{beneficiary.accountHolderName || 'Unavailable'}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
              <dt className="font-medium text-slate-500">Account number</dt>
              <dd className="font-mono">{beneficiary.accountNumber}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
              <dt className="font-medium text-slate-500">Account type</dt>
              <dd className="capitalize">{beneficiary.accountType || 'Unavailable'}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
              <dt className="font-medium text-slate-500">Relationship</dt>
              <dd className="capitalize">{beneficiary.relationship}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
              <dt className="font-medium text-slate-500">Last used</dt>
              <dd>{formatDate(beneficiary.lastUsedAt)}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
              <dt className="font-medium text-slate-500">Saved</dt>
              <dd>{formatDate(beneficiary.createdAt)}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
            {beneficiary.status === 'active' && (
              <button
                className="rounded-lg border border-red-300 px-4 py-2.5 font-semibold text-red-700"
                disabled={Boolean(busyAction)}
                onClick={() => setRemoveOpen(true)}
                type="button"
              >
                Remove beneficiary
              </button>
            )}
            {beneficiary.status === 'inactive' && (
              <button
                className="rounded-lg bg-bank-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
                disabled={Boolean(busyAction)}
                onClick={restore}
                type="button"
              >
                {busyAction === 'restore' ? 'Restoring…' : 'Restore beneficiary'}
              </button>
            )}
            {beneficiary.status === 'blocked' && (
              <p className="text-sm text-red-700">
                This beneficiary is blocked and cannot be used, removed, or restored by a customer.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-semibold">Edit beneficiary</h2>
          <p className="mt-2 text-sm text-slate-600">
            The linked account cannot be changed after it is saved.
          </p>
          {beneficiary.status === 'blocked' && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              This beneficiary is blocked and cannot be edited by a customer.
            </p>
          )}
          <form className="mt-6 space-y-5" onSubmit={handleSubmit(update)} noValidate>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="details-nickname">
                Nickname
              </label>
              <input
                aria-describedby={errors.nickname ? 'details-nickname-error' : undefined}
                aria-invalid={Boolean(errors.nickname)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
                disabled={beneficiary.status === 'blocked'}
                id="details-nickname"
                maxLength="60"
                {...register('nickname', {
                  required: 'Nickname is required',
                  minLength: { value: 2, message: 'Use at least two characters' },
                })}
              />
              {errors.nickname && (
                <span className="mt-1 block text-sm text-red-700" id="details-nickname-error">
                  {errors.nickname.message}
                </span>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="details-relationship">
                Relationship
              </label>
              <select
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
                disabled={beneficiary.status === 'blocked'}
                id="details-relationship"
                {...register('relationship')}
              >
                <option value="family">Family</option>
                <option value="friend">Friend</option>
                <option value="business">Business</option>
                <option value="other">Other</option>
              </select>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <input
                className="mt-1 h-4 w-4"
                disabled={beneficiary.status === 'blocked'}
                type="checkbox"
                {...register('isFavourite')}
              />
              <span>
                <span className="block font-medium text-slate-800">Favourite beneficiary</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Show this recipient in your favourites for quick access.
                </span>
              </span>
            </label>
            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
              disabled={beneficiary.status === 'blocked' || isSubmitting || Boolean(busyAction)}
            >
              {isSubmitting ? 'Saving changes…' : 'Save changes'}
            </button>
          </form>
        </section>
      </div>

      <ConfirmationModal
        open={removeOpen}
        title="Remove beneficiary?"
        busy={busyAction === 'remove'}
        confirmLabel="Remove"
        onCancel={() => !busyAction && setRemoveOpen(false)}
        onConfirm={remove}
      >
        {apiError && <Alert>{apiError}</Alert>}
        <p className={apiError ? 'mt-4' : undefined}>
          Remove <strong>{beneficiary.nickname}</strong> from saved beneficiaries? Previous
          transaction history will not be deleted, and this beneficiary can be restored later.
        </p>
      </ConfirmationModal>
    </div>
  );
}
