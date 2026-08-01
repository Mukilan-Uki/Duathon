import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from '../../components/common/Alert';
import DashboardLayout from '../../layouts/DashboardLayout';
import { operationsService } from '../../services/operationsService';
import { getApiError } from '../../utils/apiError';

export default function AdminOperationsPage() {
  const [audits, setAudits] = useState([]);
  const [settings, setSettings] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [auditFilters, setAuditFilters] = useState({
    search: '',
    action: '',
    targetType: '',
    dateFrom: '',
    dateTo: '',
  });
  const [announcement, setAnnouncement] = useState({ title: '', message: '', audience: 'all' });
  const { register, handleSubmit, reset } = useForm();
  const load = (filters = auditFilters) =>
    Promise.all([
      operationsService.audits({
        page: 1,
        limit: 50,
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      }),
      operationsService.settings(),
    ])
      .then(([auditResult, settingResult]) => {
        setAudits(auditResult.logs);
        setSettings(settingResult.settings);
      })
      .catch((value) => setError(getApiError(value)));
  useEffect(() => {
    Promise.all([operationsService.audits({ page: 1, limit: 50 }), operationsService.settings()])
      .then(([auditResult, settingResult]) => {
        setAudits(auditResult.logs);
        setSettings(settingResult.settings);
      })
      .catch((value) => setError(getApiError(value)));
  }, []);

  const save = async (values) => {
    setError('');
    try {
      const booleanKey = ['account_auto_approval', 'maintenance_mode'].includes(values.key);
      await operationsService.saveSetting({
        ...values,
        value: booleanKey ? values.value === 'true' : Number(values.value),
      });
      setNotice('Setting saved and audited.');
      reset();
      load();
    } catch (value) {
      setError(getApiError(value));
    }
  };

  const broadcast = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await operationsService.broadcast(announcement);
      setNotice(`${response.message} (${response.data.sent} recipients).`);
      setAnnouncement({ title: '', message: '', audience: 'all' });
    } catch (value) {
      setError(getApiError(value));
    }
  };

  return (
    <DashboardLayout role="admin">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">Governance</p>
      <h1 className="mt-2 text-3xl font-bold">System controls and audit</h1>
      {(error || notice) && (
        <div className="mt-5">
          <Alert type={error ? 'error' : 'success'}>{error || notice}</Alert>
        </div>
      )}
      <section className="mt-7 rounded-2xl border bg-white p-5 shadow-card">
        <h2 className="text-lg font-semibold">Broadcast announcement</h2>
        <form className="mt-4 grid gap-4 lg:grid-cols-[1fr_180px]" onSubmit={broadcast}>
          <input
            aria-label="Announcement title"
            className="rounded-lg border p-3"
            maxLength="120"
            placeholder="Announcement title"
            required
            value={announcement.title}
            onChange={(event) =>
              setAnnouncement((value) => ({ ...value, title: event.target.value }))
            }
          />
          <select
            aria-label="Announcement audience"
            className="rounded-lg border p-3"
            value={announcement.audience}
            onChange={(event) =>
              setAnnouncement((value) => ({ ...value, audience: event.target.value }))
            }
          >
            <option value="all">All users</option>
            <option value="customer">Customers</option>
            <option value="employee">Employees</option>
            <option value="admin">Administrators</option>
          </select>
          <textarea
            aria-label="Announcement message"
            className="rounded-lg border p-3 lg:col-span-2"
            maxLength="500"
            minLength="5"
            placeholder="Announcement message"
            required
            rows="3"
            value={announcement.message}
            onChange={(event) =>
              setAnnouncement((value) => ({ ...value, message: event.target.value }))
            }
          />
          <button className="rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white lg:col-span-2">
            Send announcement
          </button>
        </form>
      </section>
      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold">System setting</h2>
          <form className="mt-4 grid gap-4" onSubmit={handleSubmit(save)}>
            <select className="rounded-lg border p-3" {...register('key', { required: true })}>
              <option value="">Choose setting</option>
              <option value="transfer_min_minor">Minimum transfer (minor units)</option>
              <option value="transfer_max_minor">Maximum transfer (minor units)</option>
              <option value="transfer_daily_limit_minor">Daily transfer limit (minor units)</option>
              <option value="transfer_max_per_day">Maximum transfers per day</option>
              <option value="suspicious_transfer_minor">Large-transfer alert threshold</option>
              <option value="account_auto_approval">Account auto approval</option>
              <option value="loan_min_minor">Minimum loan (minor units)</option>
              <option value="loan_max_minor">Maximum loan (minor units)</option>
              <option value="loan_personal_rate_bps">Personal loan rate (bps)</option>
              <option value="loan_education_rate_bps">Education loan rate (bps)</option>
              <option value="loan_home_rate_bps">Home loan rate (bps)</option>
              <option value="loan_business_rate_bps">Business loan rate (bps)</option>
              <option value="login_max_attempts">Login attempt limit</option>
              <option value="otp_expiry_minutes">OTP expiry (minutes)</option>
              <option value="session_timeout_minutes">Session timeout (minutes)</option>
              <option value="password_min_length">Password minimum length</option>
              <option value="maintenance_mode">Maintenance mode</option>
              <option value="notification_poll_seconds">Notification polling (seconds)</option>
            </select>
            <select className="rounded-lg border p-3" {...register('category', { required: true })}>
              <option value="transactions">Transactions</option>
              <option value="accounts">Accounts</option>
              <option value="loans">Loans</option>
              <option value="security">Security</option>
              <option value="notifications">Notifications</option>
              <option value="application">Application</option>
            </select>
            <input
              className="rounded-lg border p-3"
              placeholder="Value (number or true/false)"
              {...register('value', { required: true })}
            />
            <input
              className="rounded-lg border p-3"
              placeholder="Reason and description"
              {...register('description', { required: true })}
            />
            <button className="rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white">
              Save setting
            </button>
          </form>
          <div className="mt-5 space-y-2">
            {settings.map((item) => (
              <p className="rounded-lg bg-slate-50 p-3 text-sm" key={item._id}>
                <strong>{item.key}</strong>: {String(item.value)}
              </p>
            ))}
          </div>
        </section>
        <section className="max-h-[650px] overflow-auto rounded-2xl border bg-white shadow-card">
          <h2 className="sticky top-0 bg-white p-5 text-lg font-semibold">Immutable audit log</h2>
          <form
            className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              load(auditFilters);
            }}
          >
            {['search', 'action', 'targetType', 'dateFrom', 'dateTo'].map((field) => (
              <input
                aria-label={`Audit ${field}`}
                className="rounded-lg border p-2 text-sm"
                key={field}
                placeholder={field.replace(/([A-Z])/g, ' $1')}
                type={field.startsWith('date') ? 'date' : 'text'}
                value={auditFilters[field]}
                onChange={(event) =>
                  setAuditFilters((value) => ({ ...value, [field]: event.target.value }))
                }
              />
            ))}
            <button className="rounded-lg bg-slate-900 p-2 text-sm font-semibold text-white">
              Apply audit filters
            </button>
          </form>
          {audits.map((item) => (
            <article className="border-t p-5 text-sm" key={item._id}>
              <div className="flex justify-between gap-3">
                <strong>{item.action}</strong>
                <span className="text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-slate-600">
                {item.actor?.email || 'System'} · {item.targetType}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {item.ipAddress || 'IP unavailable'}
              </p>
            </article>
          ))}
        </section>
      </div>
    </DashboardLayout>
  );
}
