import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { loanService } from '../../services/loanService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

export default function LoanReviewPage() {
  const [status, setStatus] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState('');
  const [apiError, setApiError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await loanService.staffApplications(status || undefined);
      setApplications(response.data.applications);
    } catch (error) {
      setApiError(getApiError(error, 'Unable to load loan applications'));
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (applicationId, decision) => {
    const reviewNote = notes[applicationId]?.trim();
    if (!reviewNote || reviewNote.length < 3) {
      setApiError('Enter a review note of at least three characters');
      return;
    }
    setBusyId(applicationId);
    setApiError('');
    try {
      await loanService.review(applicationId, { decision, reviewNote });
      await load();
    } catch (error) {
      setApiError(getApiError(error));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Lending operations
      </p>
      <h1 className="mt-3 text-4xl font-bold">Loan applications</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected', ''].map((value) => (
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold ${status === value ? 'bg-bank-700 text-white' : 'bg-white text-slate-700'}`}
            key={value || 'all'}
            onClick={() => setStatus(value)}
          >
            {value || 'All decisions'}
          </button>
        ))}
      </div>
      {apiError && (
        <div className="mt-5">
          <Alert>{apiError}</Alert>
        </div>
      )}
      <div className="mt-6 space-y-4">
        {applications.length ? (
          applications.map((application) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
              key={application._id}
            >
              <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">
                      {application.applicant.firstName} {application.applicant.lastName}
                    </h2>
                    <StatusBadge status={application.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{application.applicant.email}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-slate-500">Type</dt>
                      <dd className="font-medium capitalize">{application.loanType}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Requested</dt>
                      <dd className="font-medium">
                        {formatMinorUnits(application.requestedAmountMinor)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Period</dt>
                      <dd>{application.repaymentMonths} months</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Account</dt>
                      <dd className="font-mono">{application.disbursementAccount.accountNumber}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-sm text-slate-600">{application.purpose}</p>
                </div>
                {application.status === 'pending' ? (
                  <div>
                    <label className="text-sm font-medium" htmlFor={`loan-note-${application._id}`}>
                      Review note
                    </label>
                    <textarea
                      id={`loan-note-${application._id}`}
                      className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
                      maxLength="500"
                      value={notes[application._id] || ''}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [application._id]: event.target.value,
                        }))
                      }
                    />
                    <div className="mt-3 flex gap-3">
                      <button
                        className="rounded-lg bg-bank-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
                        disabled={busyId === application._id}
                        onClick={() => review(application._id, 'approve')}
                      >
                        Approve and disburse
                      </button>
                      <button
                        className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:opacity-60"
                        disabled={busyId === application._id}
                        onClick={() => review(application._id, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm">
                    <p className="font-medium">Previous decision</p>
                    <p className="mt-2 text-slate-600">{application.reviewNote}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(application.reviewedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No matching loan applications.
          </div>
        )}
      </div>
    </div>
  );
}
