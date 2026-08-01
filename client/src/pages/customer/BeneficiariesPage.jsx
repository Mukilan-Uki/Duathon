import { useCallback, useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import StatusBadge from '../../components/common/StatusBadge';
import { beneficiaryService } from '../../services/beneficiaryService';
import { getApiError } from '../../utils/apiError';

const initialFilters = {
  search: '',
  status: '',
  favourite: '',
  sort: 'nickname',
};

function formatDate(value, fallback = 'Never') {
  return value
    ? new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : fallback;
}

function BeneficiarySummary({ beneficiary, compact = false }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="truncate font-semibold text-slate-900">{beneficiary.nickname}</h3>
        {beneficiary.isFavourite && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            <Star size={14} fill="currentColor" aria-hidden="true" /> Favourite
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {beneficiary.accountHolderName || 'Unavailable'}
      </p>
      <p className="mt-1 font-mono text-sm text-slate-700">{beneficiary.accountNumber}</p>
      {compact && (
        <div className="mt-2">
          <StatusBadge status={beneficiary.available ? 'available' : 'unavailable'} />
        </div>
      )}
      {!compact && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={beneficiary.status} />
            <StatusBadge status={beneficiary.available ? 'available' : 'unavailable'} />
            <span className="text-xs capitalize text-slate-500">
              {beneficiary.accountType || 'Account type unavailable'} · {beneficiary.relationship}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Last used: {formatDate(beneficiary.lastUsedAt)}
          </p>
        </>
      )}
      {!beneficiary.available && (
        <p className="mt-2 text-sm text-amber-700">
          {beneficiary.unavailableReason || 'This beneficiary is currently unavailable.'}
        </p>
      )}
    </div>
  );
}

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [formFilters, setFormFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [removeTarget, setRemoveTarget] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [favouritesLoading, setFavouritesLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const [formError, setFormError] = useState('');
  const [verification, setVerification] = useState(null);
  const [verifiedAccountNumber, setVerifiedAccountNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const verificationRequestRef = useRef(0);
  const {
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { accountNumber: '', nickname: '', relationship: 'other' },
  });

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setApiError('');
      try {
        const params = { ...filters, page, limit: 8 };
        Object.keys(params).forEach((key) => params[key] === '' && delete params[key]);
        const response = await beneficiaryService.list(params);
        setBeneficiaries(response.data.beneficiaries);
        setPagination(response.data.pagination);
        return response.data;
      } catch (error) {
        setApiError(getApiError(error, 'Unable to load beneficiaries'));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  const loadFavourites = useCallback(async () => {
    setFavouritesLoading(true);
    try {
      const response = await beneficiaryService.list({
        status: 'active',
        favourite: true,
        sort: 'lastUsed',
        page: 1,
        limit: 6,
      });
      setFavourites(response.data.beneficiaries);
    } catch {
      setFavourites([]);
    } finally {
      setFavouritesLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
    loadFavourites();
  }, [load, loadFavourites]);

  const clearVerification = () => {
    verificationRequestRef.current += 1;
    setVerification(null);
    setVerifiedAccountNumber('');
    setFormError('');
    setVerifying(false);
  };

  const verifyAccount = async () => {
    setFormError('');
    setVerification(null);
    setVerifiedAccountNumber('');
    if (!(await trigger('accountNumber'))) return;

    const accountNumber = getValues('accountNumber');
    const requestId = ++verificationRequestRef.current;
    setVerifying(true);
    try {
      const response = await beneficiaryService.verifyAccount(accountNumber);
      if (
        requestId !== verificationRequestRef.current ||
        getValues('accountNumber') !== accountNumber
      ) {
        return;
      }
      setVerification(response.data.verification);
      setVerifiedAccountNumber(accountNumber);
    } catch (error) {
      if (requestId !== verificationRequestRef.current) return;
      setFormError(getApiError(error, 'Unable to verify this account'));
    } finally {
      if (requestId === verificationRequestRef.current) setVerifying(false);
    }
  };

  const add = async (values) => {
    setFormError('');
    setNotice('');
    if (
      !verification ||
      !verification.canReceiveTransfers ||
      verifiedAccountNumber !== values.accountNumber
    ) {
      setFormError('Verify an active receiver account before saving this beneficiary.');
      return;
    }

    try {
      const response = await beneficiaryService.add({
        accountNumber: values.accountNumber,
        nickname: values.nickname,
        relationship: values.relationship,
      });
      setNotice(response.message);
      reset();
      clearVerification();
      await Promise.all([load(1), loadFavourites()]);
    } catch (error) {
      setFormError(getApiError(error, 'Unable to save beneficiary'));
    }
  };

  const remove = async () => {
    if (!removeTarget) return;
    setBusyId(removeTarget._id);
    setApiError('');
    setNotice('');
    try {
      const response = await beneficiaryService.remove(removeTarget._id);
      setNotice(response.message);
      setRemoveTarget(null);
      const [result] = await Promise.all([load(pagination.page), loadFavourites()]);
      if (result && pagination.page > result.pagination.pages) {
        await load(result.pagination.pages);
      }
    } catch (error) {
      setApiError(getApiError(error, 'Unable to remove beneficiary'));
    } finally {
      setBusyId('');
    }
  };

  const restore = async (beneficiary) => {
    setBusyId(beneficiary._id);
    setApiError('');
    setNotice('');
    try {
      const response = await beneficiaryService.restore(beneficiary._id);
      setNotice(response.message);
      const [result] = await Promise.all([load(pagination.page), loadFavourites()]);
      if (result && pagination.page > result.pagination.pages) {
        await load(result.pagination.pages);
      }
    } catch (error) {
      setApiError(getApiError(error, 'Unable to restore beneficiary'));
    } finally {
      setBusyId('');
    }
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters(formFilters);
  };

  const clearFilters = () => {
    setFormFilters(initialFilters);
    setFilters(initialFilters);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Saved recipients
      </p>
      <h1 className="mt-3 text-4xl font-bold">Beneficiaries</h1>
      <p className="mt-3 text-slate-600">
        Save verified Duothan accounts and manage who you can pay quickly.
      </p>

      {notice && (
        <div className="mt-6">
          <Alert type="success">{notice}</Alert>
        </div>
      )}
      {apiError && (
        <div className="mt-6 space-y-3">
          <Alert>{apiError}</Alert>
          <button className="text-sm font-semibold text-bank-700" onClick={() => load(1)}>
            Try loading again
          </button>
        </div>
      )}

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">Add beneficiary</h2>
          <p className="mt-2 text-sm text-slate-600">
            Verify the receiver before saving their account.
          </p>
          <form className="mt-5 space-y-5" onSubmit={handleSubmit(add)} noValidate>
            {formError && <Alert>{formError}</Alert>}
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="beneficiary-account">
                Account number
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  aria-describedby={errors.accountNumber ? 'beneficiary-account-error' : undefined}
                  aria-invalid={Boolean(errors.accountNumber)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono"
                  id="beneficiary-account"
                  inputMode="numeric"
                  maxLength="12"
                  {...register('accountNumber', {
                    required: 'Account number is required',
                    pattern: { value: /^\d{12}$/, message: 'Enter a 12-digit account number' },
                    onChange: clearVerification,
                  })}
                />
                <button
                  className="rounded-lg border border-bank-700 px-4 py-2.5 text-sm font-semibold text-bank-700 disabled:opacity-60"
                  disabled={verifying || isSubmitting}
                  onClick={verifyAccount}
                  type="button"
                >
                  {verifying ? 'Checking…' : 'Verify'}
                </button>
              </div>
              {errors.accountNumber && (
                <span className="mt-1 block text-sm text-red-700" id="beneficiary-account-error">
                  {errors.accountNumber.message}
                </span>
              )}
            </div>

            {verification && (
              <div
                className={`rounded-xl border p-4 text-sm ${
                  verification.canReceiveTransfers
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
                role="status"
              >
                <p className="font-semibold">
                  {verification.canReceiveTransfers ? 'Verified receiver' : 'Receiver unavailable'}
                </p>
                <p className="mt-1">{verification.accountHolderName}</p>
                <p className="mt-1 font-mono">{verification.accountNumber}</p>
                <p className="mt-1 capitalize">{verification.accountType}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="beneficiary-nickname">
                Nickname
              </label>
              <input
                aria-describedby={errors.nickname ? 'beneficiary-nickname-error' : undefined}
                aria-invalid={Boolean(errors.nickname)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
                id="beneficiary-nickname"
                maxLength="60"
                {...register('nickname', {
                  required: 'Nickname is required',
                  minLength: { value: 2, message: 'Use at least two characters' },
                })}
              />
              {errors.nickname && (
                <span className="mt-1 block text-sm text-red-700" id="beneficiary-nickname-error">
                  {errors.nickname.message}
                </span>
              )}
            </div>

            <div>
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="beneficiary-relationship"
              >
                Relationship
              </label>
              <select
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
                id="beneficiary-relationship"
                {...register('relationship', { required: true })}
              >
                <option value="family">Family</option>
                <option value="friend">Friend</option>
                <option value="business">Business</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              className="w-full rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
              disabled={isSubmitting || verifying || !verification?.canReceiveTransfers}
            >
              {isSubmitting ? 'Saving…' : 'Save beneficiary'}
            </button>
          </form>
        </section>

        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Star className="text-amber-600" size={20} fill="currentColor" aria-hidden="true" />
              <h2 className="text-xl font-semibold">Favourite beneficiaries</h2>
            </div>
            {favouritesLoading ? (
              <p className="mt-4 text-sm text-slate-500" role="status">
                Loading favourites…
              </p>
            ) : favourites.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {favourites.map((beneficiary) => (
                  <Link
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-bank-300 hover:bg-bank-50"
                    key={beneficiary._id}
                    to={`/beneficiaries/${beneficiary._id}`}
                  >
                    <BeneficiarySummary beneficiary={beneficiary} compact />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Mark a beneficiary as a favourite to keep them close at hand.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-xl font-semibold">Saved beneficiaries</h2>
                  <p className="mt-1 text-sm text-slate-500">{pagination.total} matching records</p>
                </div>
              </div>
              <form
                className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
                onSubmit={applyFilters}
              >
                <label className="xl:col-span-2">
                  <span className="sr-only">Search by nickname</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    maxLength="60"
                    placeholder="Search by nickname…"
                    value={formFilters.search}
                    onChange={(event) =>
                      setFormFilters((current) => ({ ...current, search: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span className="sr-only">Beneficiary status</span>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={formFilters.status}
                    onChange={(event) =>
                      setFormFilters((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </label>
                <label>
                  <span className="sr-only">Favourite filter</span>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={formFilters.favourite}
                    onChange={(event) =>
                      setFormFilters((current) => ({ ...current, favourite: event.target.value }))
                    }
                  >
                    <option value="">All beneficiaries</option>
                    <option value="true">Favourites</option>
                    <option value="false">Not favourites</option>
                  </select>
                </label>
                <label>
                  <span className="sr-only">Sort beneficiaries</span>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    value={formFilters.sort}
                    onChange={(event) =>
                      setFormFilters((current) => ({ ...current, sort: event.target.value }))
                    }
                  >
                    <option value="nickname">Nickname</option>
                    <option value="recent">Recently added</option>
                    <option value="lastUsed">Last used</option>
                  </select>
                </label>
                <div className="flex gap-2 md:col-span-2 xl:col-span-5">
                  <button className="rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white">
                    Apply filters
                  </button>
                  <button
                    className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700"
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            {loading ? (
              <p className="p-6 text-slate-500" role="status">
                Loading beneficiaries…
              </p>
            ) : beneficiaries.length ? (
              <ul className="divide-y divide-slate-100">
                {beneficiaries.map((beneficiary) => (
                  <li
                    className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center"
                    key={beneficiary._id}
                  >
                    <BeneficiarySummary beneficiary={beneficiary} />
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
                        to={`/beneficiaries/${beneficiary._id}`}
                      >
                        Details
                      </Link>
                      {beneficiary.status === 'active' && (
                        <button
                          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                          disabled={Boolean(busyId)}
                          onClick={() => {
                            setApiError('');
                            setRemoveTarget(beneficiary);
                          }}
                          type="button"
                        >
                          Remove
                        </button>
                      )}
                      {beneficiary.status === 'inactive' && (
                        <button
                          className="rounded-lg bg-bank-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          disabled={Boolean(busyId)}
                          onClick={() => restore(beneficiary)}
                          type="button"
                        >
                          {busyId === beneficiary._id ? 'Restoring…' : 'Restore'}
                        </button>
                      )}
                    </div>
                    <span className="sr-only">Last used {formatDate(beneficiary.lastUsedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center">
                <p className="text-slate-600">No beneficiaries match these filters.</p>
                <button className="mt-3 font-semibold text-bank-700" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 p-5">
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40"
                disabled={loading || pagination.page <= 1}
                onClick={() => load(pagination.page - 1)}
                type="button"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40"
                disabled={loading || pagination.page >= pagination.pages}
                onClick={() => load(pagination.page + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </section>
        </div>
      </div>

      <ConfirmationModal
        open={Boolean(removeTarget)}
        title="Remove beneficiary?"
        busy={Boolean(busyId)}
        confirmLabel="Remove"
        onCancel={() => !busyId && setRemoveTarget(null)}
        onConfirm={remove}
      >
        {removeTarget && (
          <>
            {apiError && <Alert>{apiError}</Alert>}
            <p className={apiError ? 'mt-4' : undefined}>
              Remove <strong>{removeTarget.nickname}</strong> from saved beneficiaries? Their
              previous transactions will remain available, and you can restore this beneficiary
              later.
            </p>
          </>
        )}
      </ConfirmationModal>
    </div>
  );
}
