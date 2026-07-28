import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from '../../components/common/Alert';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import StatusBadge from '../../components/common/StatusBadge';
import { accountService } from '../../services/accountService';
import { loanService } from '../../services/loanService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits, parseMajorUnitsToMinor } from '../../utils/money';

export default function LoansPage() {
  const [accounts, setAccounts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payment, setPayment] = useState(null);
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { loanType: 'personal', repaymentMonths: 12 } });

  const load = useCallback(async () => {
    try {
      const [accountResponse, applicationResponse, loanResponse] = await Promise.all([
        accountService.getMine(),
        loanService.myApplications(),
        loanService.myLoans(),
      ]);
      setAccounts(accountResponse.data.accounts.filter((account) => account.status === 'active'));
      setApplications(applicationResponse.data.applications);
      setLoans(loanResponse.data.loans);
    } catch (error) {
      setApiError(getApiError(error, 'Unable to load loan information'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const apply = async (values) => {
    setApiError('');
    setNotice('');
    try {
      const response = await loanService.apply({
        disbursementAccountId: values.disbursementAccountId,
        loanType: values.loanType,
        requestedAmountMinor: parseMajorUnitsToMinor(values.requestedAmount),
        purpose: values.purpose,
        repaymentMonths: Number(values.repaymentMonths),
      });
      setNotice(response.message);
      reset();
      await load();
    } catch (error) {
      setApiError(getApiError(error, error.message));
    }
  };

  const openPayment = (loan) => {
    setPayment({
      loan,
      idempotencyKey: crypto.randomUUID(),
    });
    setPaymentAccount(accounts[0]?._id || '');
    setPaymentAmount((loan.monthlyInstallmentMinor / 100).toFixed(2));
  };

  const confirmPayment = async () => {
    setBusy(true);
    setApiError('');
    try {
      const amountMinor = parseMajorUnitsToMinor(paymentAmount);
      const response = await loanService.pay(
        payment.loan._id,
        { sourceAccountId: paymentAccount, amountMinor },
        payment.idempotencyKey,
      );
      setNotice(response.message);
      setPayment(null);
      await load();
    } catch (error) {
      setApiError(getApiError(error, error.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Customer lending
      </p>
      <h1 className="mt-3 text-4xl font-bold">Loans</h1>
      <p className="mt-3 text-slate-600">
        Apply, track decisions, and repay approved loans securely.
      </p>
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

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">New loan application</h2>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit(apply)} noValidate>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Disbursement account</span>
              <select
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                {...register('disbursementAccountId', { required: 'Select an account' })}
              >
                <option value="">Select active account</option>
                {accounts.map((account) => (
                  <option value={account._id} key={account._id}>
                    {account.accountNumber}
                  </option>
                ))}
              </select>
              {errors.disbursementAccountId && (
                <span className="text-sm text-red-700">{errors.disbursementAccountId.message}</span>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Loan type</span>
              <select
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 capitalize"
                {...register('loanType')}
              >
                {['personal', 'education', 'home', 'business'].map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Requested amount (LKR)</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                inputMode="decimal"
                {...register('requestedAmount', { required: 'Amount is required' })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Repayment period</span>
              <select
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                {...register('repaymentMonths')}
              >
                {[6, 12, 24, 36, 60, 120, 240, 360].map((months) => (
                  <option value={months} key={months}>
                    {months} months
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Purpose</span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                maxLength="500"
                {...register('purpose', {
                  required: 'Purpose is required',
                  minLength: { value: 10, message: 'Provide at least 10 characters' },
                })}
              />
              {errors.purpose && (
                <span className="text-sm text-red-700">{errors.purpose.message}</span>
              )}
            </label>
            <button
              className="w-full rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
              disabled={isSubmitting || !accounts.length}
            >
              {isSubmitting ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-xl font-semibold">Active and previous loans</h2>
            <div className="mt-5 space-y-4">
              {loans.length ? (
                loans.map((loan) => (
                  <article className="rounded-xl border border-slate-200 p-5" key={loan._id}>
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="font-mono text-sm">{loan.loanNumber}</p>
                        <h3 className="mt-1 font-semibold capitalize">{loan.loanType} loan</h3>
                      </div>
                      <StatusBadge status={loan.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Outstanding</p>
                        <p className="mt-1 font-semibold">
                          {formatMinorUnits(loan.outstandingMinor)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Monthly installment</p>
                        <p className="mt-1 font-semibold">
                          {formatMinorUnits(loan.monthlyInstallmentMinor)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Interest rate</p>
                        <p className="mt-1">{(loan.interestRateBps / 100).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Next due</p>
                        <p className="mt-1">
                          {new Date(loan.nextPaymentDueAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {loan.status === 'active' && (
                      <button
                        className="mt-5 rounded-lg bg-bank-700 px-4 py-2 font-semibold text-white"
                        onClick={() => openPayment(loan)}
                      >
                        Make payment
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <p className="text-slate-500">No approved loans yet.</p>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-xl font-semibold">Application history</h2>
            <div className="mt-5 space-y-3">
              {applications.length ? (
                applications.map((application) => (
                  <div
                    className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3"
                    key={application._id}
                  >
                    <div>
                      <p className="font-medium capitalize">{application.loanType}</p>
                      <p className="text-sm text-slate-500">
                        {formatMinorUnits(application.requestedAmountMinor)} ·{' '}
                        {application.repaymentMonths} months
                      </p>
                      {application.reviewNote && (
                        <p className="mt-1 text-sm text-slate-600">
                          Review: {application.reviewNote}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={application.status} />
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No applications yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <ConfirmationModal
        open={Boolean(payment)}
        title="Confirm loan payment"
        busy={busy}
        onCancel={() => !busy && setPayment(null)}
        onConfirm={confirmPayment}
      >
        {payment && (
          <div className="space-y-4">
            <p>
              Loan <strong>{payment.loan.loanNumber}</strong> has an outstanding balance of{' '}
              <strong>{formatMinorUnits(payment.loan.outstandingMinor)}</strong>.
            </p>
            <label className="block">
              <span>Payment account</span>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={paymentAccount}
                onChange={(event) => setPaymentAccount(event.target.value)}
              >
                {accounts.map((account) => (
                  <option value={account._id} key={account._id}>
                    {account.accountNumber} · {formatMinorUnits(account.availableBalanceMinor)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span>Amount (LKR)</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                inputMode="decimal"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </label>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}
