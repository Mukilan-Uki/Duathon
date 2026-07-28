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
  const { register, handleSubmit, reset } = useForm();
  const load = () =>
    Promise.all([operationsService.audits({ page: 1, limit: 25 }), operationsService.settings()])
      .then(([auditResult, settingResult]) => {
        setAudits(auditResult.logs);
        setSettings(settingResult.settings);
      })
      .catch((value) => setError(getApiError(value)));
  useEffect(load, []);

  const save = async (values) => {
    setError('');
    try {
      const booleanKey = values.key === 'account_auto_approval';
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

  return (
    <DashboardLayout role="admin">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">Governance</p>
      <h1 className="mt-2 text-3xl font-bold">System controls and audit</h1>
      {(error || notice) && (
        <div className="mt-5">
          <Alert type={error ? 'error' : 'success'}>{error || notice}</Alert>
        </div>
      )}
      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold">System setting</h2>
          <form className="mt-4 grid gap-4" onSubmit={handleSubmit(save)}>
            <select className="rounded-lg border p-3" {...register('key', { required: true })}>
              <option value="">Choose setting</option>
              <option value="transfer_min_minor">Minimum transfer (minor units)</option>
              <option value="transfer_max_minor">Maximum transfer (minor units)</option>
              <option value="account_auto_approval">Account auto approval</option>
              <option value="loan_min_minor">Minimum loan (minor units)</option>
              <option value="loan_max_minor">Maximum loan (minor units)</option>
              <option value="login_max_attempts">Login attempt limit</option>
            </select>
            <select className="rounded-lg border p-3" {...register('category', { required: true })}>
              <option value="transactions">Transactions</option>
              <option value="accounts">Accounts</option>
              <option value="loans">Loans</option>
              <option value="security">Security</option>
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
