import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import StatusBadge from '../../components/common/StatusBadge';
import { accountService } from '../../services/accountService';
import { beneficiaryService } from '../../services/beneficiaryService';
import { transactionService } from '../../services/transactionService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits, parseMajorUnitsToMinor } from '../../utils/money';

function BeneficiaryChoice({ beneficiary, selected, onSelect }) {
  const usable = beneficiary.status === 'active' && beneficiary.available;
  return (
    <button
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
        selected
          ? 'border-bank-600 bg-bank-50 ring-2 ring-bank-100'
          : 'border-slate-200 bg-white hover:border-bank-300'
      }`}
      disabled={!usable}
      onClick={() => onSelect(beneficiary)}
      type="button"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="truncate font-semibold text-slate-900">{beneficiary.nickname}</span>
        {beneficiary.isFavourite && (
          <Star
            className="shrink-0 text-amber-600"
            size={16}
            fill="currentColor"
            aria-label="Favourite"
          />
        )}
      </span>
      <span className="mt-1 block text-sm text-slate-600">
        {beneficiary.accountHolderName || 'Unavailable'}
      </span>
      <span className="mt-1 block font-mono text-xs text-slate-600">
        {beneficiary.accountNumber}
      </span>
      {!usable && (
        <span className="mt-2 block text-xs font-medium text-amber-700">
          {beneficiary.unavailableReason || 'Currently unavailable'}
        </span>
      )}
    </button>
  );
}

function RecipientSection({ title, beneficiaries, selectedId, onSelect, emptyMessage }) {
  return (
    <section aria-labelledby={`recipient-${title.toLowerCase().replaceAll(' ', '-')}`}>
      <h3
        className="text-sm font-semibold text-slate-800"
        id={`recipient-${title.toLowerCase().replaceAll(' ', '-')}`}
      >
        {title}
      </h3>
      {beneficiaries.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {beneficiaries.map((beneficiary) => (
            <BeneficiaryChoice
              beneficiary={beneficiary}
              key={beneficiary._id}
              onSelect={onSelect}
              selected={selectedId === beneficiary._id}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{emptyMessage}</p>
      )}
    </section>
  );
}

export default function TransferPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedBeneficiaryId = searchParams.get('beneficiaryId');
  const [accounts, setAccounts] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [recipientMode, setRecipientMode] = useState(requestedBeneficiaryId ? 'saved' : 'manual');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(true);
  const [beneficiaryError, setBeneficiaryError] = useState('');
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({ shouldUnregister: true });

  useEffect(() => {
    let current = true;
    setAccountsLoading(true);
    accountService
      .getMine()
      .then((response) => {
        if (current) {
          setAccounts(response.data.accounts.filter((account) => account.status === 'active'));
        }
      })
      .catch((error) => {
        if (current) setApiError(getApiError(error, 'Unable to load your accounts'));
      })
      .finally(() => {
        if (current) setAccountsLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  const loadBeneficiaries = useCallback(async (search = '') => {
    setBeneficiariesLoading(true);
    setBeneficiaryError('');
    try {
      const [directoryResponse, favouriteResponse, recentResponse] = await Promise.all([
        beneficiaryService.list({
          status: 'active',
          search: search.trim() || undefined,
          sort: 'nickname',
          page: 1,
          limit: 20,
        }),
        beneficiaryService.list({
          status: 'active',
          favourite: true,
          sort: 'lastUsed',
          page: 1,
          limit: 6,
        }),
        beneficiaryService.list({
          status: 'active',
          sort: 'lastUsed',
          page: 1,
          limit: 8,
        }),
      ]);
      setDirectory(directoryResponse.data.beneficiaries);
      setDirectoryTotal(directoryResponse.data.pagination.total);
      setFavourites(favouriteResponse.data.beneficiaries);
      setRecent(recentResponse.data.beneficiaries.filter((beneficiary) => beneficiary.lastUsedAt));
    } catch (error) {
      setBeneficiaryError(getApiError(error, 'Unable to load saved beneficiaries'));
    } finally {
      setBeneficiariesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBeneficiaries();
  }, [loadBeneficiaries]);

  useEffect(() => {
    if (!requestedBeneficiaryId) return undefined;
    let current = true;
    beneficiaryService
      .get(requestedBeneficiaryId)
      .then((response) => {
        if (!current) return;
        const beneficiary = response.data.beneficiary;
        if (beneficiary.status !== 'active' || !beneficiary.available) {
          setBeneficiaryError(
            beneficiary.unavailableReason || 'This beneficiary cannot receive transfers.',
          );
          return;
        }
        setSelectedBeneficiary(beneficiary);
        setRecipientMode('saved');
      })
      .catch((error) => {
        if (current) {
          setBeneficiaryError(getApiError(error, 'Unable to select this beneficiary'));
        }
      });
    return () => {
      current = false;
    };
  }, [requestedBeneficiaryId]);

  const displayedRecent = useMemo(() => {
    const favouriteIds = new Set(favourites.map((beneficiary) => beneficiary._id));
    return recent.filter((beneficiary) => !favouriteIds.has(beneficiary._id)).slice(0, 6);
  }, [favourites, recent]);

  const chooseBeneficiary = (beneficiary) => {
    if (beneficiary.status !== 'active' || !beneficiary.available) return;
    setSelectedBeneficiary(beneficiary);
    setApiError('');
  };

  const switchMode = (mode) => {
    setRecipientMode(mode);
    setApiError('');
    if (mode === 'manual') setSelectedBeneficiary(null);
    if (mode === 'saved') clearErrors('receiverAccountNumber');
  };

  const prepare = async (values) => {
    setApiError('');
    try {
      const amountMinor = parseMajorUnitsToMinor(values.amount);
      const sender = accounts.find((account) => account._id === values.senderAccountId);
      if (!sender) throw new Error('Select an active sender account');

      let recipient;
      let receiverPayload;
      if (recipientMode === 'saved') {
        if (!selectedBeneficiary) throw new Error('Select a saved beneficiary');
        const beneficiaryResponse = await beneficiaryService.get(selectedBeneficiary._id);
        const beneficiary = beneficiaryResponse.data.beneficiary;
        if (beneficiary.status !== 'active' || !beneficiary.available) {
          throw new Error(
            beneficiary.unavailableReason || 'This beneficiary cannot receive transfers',
          );
        }
        setSelectedBeneficiary(beneficiary);
        recipient = {
          nickname: beneficiary.nickname,
          accountHolderName: beneficiary.accountHolderName,
          accountNumber: beneficiary.accountNumber,
          accountType: beneficiary.accountType,
        };
        receiverPayload = { beneficiaryId: beneficiary._id };
      } else {
        const recipientResponse = await transactionService.validateRecipient(
          values.receiverAccountNumber,
        );
        if (!recipientResponse.data.recipient.canReceiveTransfers) {
          throw new Error('The recipient account cannot receive transfers');
        }
        recipient = recipientResponse.data.recipient;
        receiverPayload = { receiverAccountNumber: values.receiverAccountNumber };
      }

      setPending({
        payload: {
          senderAccountId: values.senderAccountId,
          ...receiverPayload,
          amount: amountMinor,
          description: values.description || '',
        },
        sender,
        recipient,
        idempotencyKey: crypto.randomUUID(),
      });
    } catch (error) {
      setApiError(
        error.response
          ? getApiError(error, 'Unable to validate this transfer')
          : error.message || 'Unable to validate this transfer',
      );
    }
  };

  const confirm = async () => {
    setBusy(true);
    setApiError('');
    try {
      const response = await transactionService.transfer(pending.payload, pending.idempotencyKey);
      navigate('/transfer/result', {
        replace: true,
        state: { transaction: response.data.transaction, message: response.message },
      });
    } catch (error) {
      setApiError(getApiError(error, 'Transfer could not be completed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Secure transfer
      </p>
      <h1 className="mt-3 text-4xl font-bold">Send money</h1>
      <p className="mt-3 text-slate-600">
        Choose a saved beneficiary or verify an account manually before reviewing the payment.
      </p>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <form className="space-y-6" onSubmit={handleSubmit(prepare)} noValidate>
          {apiError && <Alert>{apiError}</Alert>}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="sender-account">
              From account
            </label>
            <select
              aria-describedby={errors.senderAccountId ? 'sender-account-error' : undefined}
              aria-invalid={Boolean(errors.senderAccountId)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
              disabled={accountsLoading}
              id="sender-account"
              {...register('senderAccountId', { required: 'Select a sender account' })}
            >
              <option value="">
                {accountsLoading ? 'Loading accounts…' : 'Select an account'}
              </option>
              {accounts.map((account) => (
                <option value={account._id} key={account._id}>
                  {account.maskedAccountNumber} ·{' '}
                  {formatMinorUnits(account.availableBalanceMinor, account.currency)}
                </option>
              ))}
            </select>
            {errors.senderAccountId && (
              <span className="mt-1 block text-sm text-red-700" id="sender-account-error">
                {errors.senderAccountId.message}
              </span>
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Choose the receiver</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
              <label
                className={`cursor-pointer rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
                  recipientMode === 'saved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <input
                  checked={recipientMode === 'saved'}
                  className="sr-only"
                  name="recipient-mode"
                  onChange={() => switchMode('saved')}
                  type="radio"
                />
                Saved beneficiary
              </label>
              <label
                className={`cursor-pointer rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
                  recipientMode === 'manual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                <input
                  checked={recipientMode === 'manual'}
                  className="sr-only"
                  name="recipient-mode"
                  onChange={() => switchMode('manual')}
                  type="radio"
                />
                Enter manually
              </label>
            </div>
          </fieldset>

          {recipientMode === 'saved' ? (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="beneficiary-search">
                  Search beneficiaries
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5"
                    id="beneficiary-search"
                    maxLength="60"
                    onChange={(event) => setBeneficiarySearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        loadBeneficiaries(beneficiarySearch);
                      }
                    }}
                    placeholder="Search by nickname…"
                    value={beneficiarySearch}
                  />
                  <button
                    aria-label="Search saved beneficiaries"
                    className="rounded-lg bg-slate-900 px-4 text-white disabled:opacity-60"
                    disabled={beneficiariesLoading}
                    onClick={() => loadBeneficiaries(beneficiarySearch)}
                    type="button"
                  >
                    <Search size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {beneficiaryError && <Alert>{beneficiaryError}</Alert>}
              {beneficiariesLoading ? (
                <p className="text-sm text-slate-500" role="status">
                  Loading saved beneficiaries…
                </p>
              ) : (
                <>
                  {selectedBeneficiary && (
                    <div className="rounded-xl border border-bank-200 bg-bank-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-bank-700">
                        Selected receiver
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{selectedBeneficiary.nickname}</span>
                        <StatusBadge
                          status={selectedBeneficiary.available ? 'available' : 'unavailable'}
                        />
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {selectedBeneficiary.accountHolderName} ·{' '}
                        <span className="font-mono">{selectedBeneficiary.accountNumber}</span>
                      </p>
                    </div>
                  )}
                  <RecipientSection
                    beneficiaries={favourites}
                    emptyMessage="No favourite beneficiaries yet."
                    onSelect={chooseBeneficiary}
                    selectedId={selectedBeneficiary?._id}
                    title="Favourites"
                  />
                  <RecipientSection
                    beneficiaries={displayedRecent}
                    emptyMessage="Recent beneficiaries appear after a successful transfer."
                    onSelect={chooseBeneficiary}
                    selectedId={selectedBeneficiary?._id}
                    title="Recent beneficiaries"
                  />
                  <RecipientSection
                    beneficiaries={directory}
                    emptyMessage="No saved beneficiaries match your search."
                    onSelect={chooseBeneficiary}
                    selectedId={selectedBeneficiary?._id}
                    title={`All saved beneficiaries (${directoryTotal})`}
                  />
                  {!directoryTotal && (
                    <Link
                      className="inline-flex text-sm font-semibold text-bank-700"
                      to="/beneficiaries"
                    >
                      Add a beneficiary
                    </Link>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="receiver-account">
                Receiver account number
              </label>
              <input
                aria-describedby={
                  errors.receiverAccountNumber ? 'receiver-account-error' : undefined
                }
                aria-invalid={Boolean(errors.receiverAccountNumber)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono"
                id="receiver-account"
                inputMode="numeric"
                maxLength="12"
                {...register('receiverAccountNumber', {
                  required: 'Receiver account is required',
                  pattern: { value: /^\d{12}$/, message: 'Enter a 12-digit account number' },
                })}
              />
              {errors.receiverAccountNumber && (
                <span className="mt-1 block text-sm text-red-700" id="receiver-account-error">
                  {errors.receiverAccountNumber.message}
                </span>
              )}
              <p className="mt-2 text-xs text-slate-500">
                The receiver will be verified before you can review the transfer.
              </p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="transfer-amount">
                Amount (LKR)
              </label>
              <input
                aria-describedby={errors.amount ? 'transfer-amount-error' : undefined}
                aria-invalid={Boolean(errors.amount)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
                id="transfer-amount"
                inputMode="decimal"
                placeholder="0.00"
                {...register('amount', { required: 'Amount is required' })}
              />
              {errors.amount && (
                <span className="mt-1 block text-sm text-red-700" id="transfer-amount-error">
                  {errors.amount.message}
                </span>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="transfer-description">
                Description
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
                id="transfer-description"
                maxLength="200"
                {...register('description')}
              />
            </div>
          </div>

          <button
            className="w-full rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            disabled={accountsLoading || !accounts.length || isSubmitting}
          >
            {isSubmitting ? 'Validating recipient…' : 'Review transfer'}
          </button>
          {!accountsLoading && !accounts.length && (
            <p className="text-center text-sm text-amber-700">
              An active account is required to send money.
            </p>
          )}
        </form>
      </section>

      <ConfirmationModal
        open={Boolean(pending)}
        title="Confirm money transfer"
        busy={busy}
        onCancel={() => !busy && setPending(null)}
        onConfirm={confirm}
      >
        {pending && (
          <dl className="space-y-3">
            <div className="flex justify-between gap-4">
              <dt>From</dt>
              <dd className="font-mono">{pending.sender.maskedAccountNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>To</dt>
              <dd className="text-right">
                {pending.recipient.nickname && (
                  <span className="block font-semibold">{pending.recipient.nickname}</span>
                )}
                <span className="block">{pending.recipient.accountHolderName}</span>
                <span className="block font-mono">{pending.recipient.accountNumber}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Amount</dt>
              <dd className="font-semibold">{formatMinorUnits(pending.payload.amount)}</dd>
            </div>
            {pending.payload.description && (
              <div className="flex justify-between gap-4">
                <dt>Description</dt>
                <dd className="text-right">{pending.payload.description}</dd>
              </div>
            )}
            <p className="pt-3 text-amber-700">
              Confirm the receiver and amount carefully. Completed transfers cannot normally be
              cancelled.
            </p>
          </dl>
        )}
      </ConfirmationModal>
    </div>
  );
}
