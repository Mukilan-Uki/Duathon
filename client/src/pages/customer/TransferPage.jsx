import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from '../../components/common/Alert';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { accountService } from '../../services/accountService';
import { transactionService } from '../../services/transactionService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits, parseMajorUnitsToMinor } from '../../utils/money';

export default function TransferPage() {
  const [accounts, setAccounts] = useState([]);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const [notice, setNotice] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    accountService
      .getMine()
      .then(({ data }) =>
        setAccounts(data.accounts.filter((account) => account.status === 'active')),
      )
      .catch((error) => setApiError(getApiError(error)));
  }, []);

  const prepare = (values) => {
    setApiError('');
    setNotice('');
    try {
      const amountMinor = parseMajorUnitsToMinor(values.amount);
      const sender = accounts.find((account) => account._id === values.senderAccountId);
      if (!sender) throw new Error('Select an active sender account');
      if (sender.accountNumber === values.receiverAccountNumber)
        throw new Error('Sender and receiver accounts must be different');
      setPending({
        payload: {
          senderAccountId: values.senderAccountId,
          receiverAccountNumber: values.receiverAccountNumber,
          amountMinor,
          description: values.description || '',
        },
        sender,
        idempotencyKey: crypto.randomUUID(),
      });
    } catch (error) {
      setApiError(error.message);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setApiError('');
    try {
      const response = await transactionService.transfer(pending.payload, pending.idempotencyKey);
      setNotice(`${response.message}. Reference: ${response.data.transaction.transferReference}`);
      setPending(null);
      reset();
      const refreshed = await accountService.getMine();
      setAccounts(refreshed.data.accounts.filter((account) => account.status === 'active'));
    } catch (error) {
      setApiError(getApiError(error, 'Transfer could not be completed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Secure transfer
      </p>
      <h1 className="mt-3 text-4xl font-bold">Send money</h1>
      <p className="mt-3 text-slate-600">
        Transfers are processed atomically and cannot partially complete.
      </p>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit(prepare)} noValidate>
          {apiError && <Alert>{apiError}</Alert>}
          {notice && <Alert type="success">{notice}</Alert>}
          <label className="block">
            <span className="text-sm font-medium text-slate-700">From account</span>
            <select
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
              {...register('senderAccountId', { required: 'Select a sender account' })}
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option value={account._id} key={account._id}>
                  {account.accountNumber} ·{' '}
                  {formatMinorUnits(account.availableBalanceMinor, account.currency)}
                </option>
              ))}
            </select>
            {errors.senderAccountId && (
              <span className="mt-1 block text-sm text-red-700">
                {errors.senderAccountId.message}
              </span>
            )}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Receiver account number</span>
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono"
              inputMode="numeric"
              maxLength="12"
              {...register('receiverAccountNumber', {
                required: 'Receiver account is required',
                pattern: { value: /^\d{12}$/, message: 'Enter a 12-digit account number' },
              })}
            />
            {errors.receiverAccountNumber && (
              <span className="mt-1 block text-sm text-red-700">
                {errors.receiverAccountNumber.message}
              </span>
            )}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Amount (LKR)</span>
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
              inputMode="decimal"
              placeholder="0.00"
              {...register('amount', { required: 'Amount is required' })}
            />
            {errors.amount && (
              <span className="mt-1 block text-sm text-red-700">{errors.amount.message}</span>
            )}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
              maxLength="200"
              {...register('description')}
            />
          </label>
          <button
            className="w-full rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            disabled={!accounts.length}
          >
            Review transfer
          </button>
          {!accounts.length && (
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
          <dl className="space-y-2">
            <div className="flex justify-between gap-4">
              <dt>From</dt>
              <dd className="font-mono">{pending.sender.accountNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>To</dt>
              <dd className="font-mono">{pending.payload.receiverAccountNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Amount</dt>
              <dd className="font-semibold">{formatMinorUnits(pending.payload.amountMinor)}</dd>
            </div>
          </dl>
        )}
      </ConfirmationModal>
    </div>
  );
}
