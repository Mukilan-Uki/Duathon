import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import FormField from '../../components/forms/FormField';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { operationsService } from '../../services/operationsService';
import { getApiError } from '../../utils/apiError';

export default function ProfilePage() {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    authService
      .getLoginHistory()
      .then(({ data }) => setHistory(data.history))
      .catch(() => {});
  }, []);

  const changePassword = async (values) => {
    setApiError('');
    setNotice('');
    if (values.newPassword !== values.confirmPassword) {
      setApiError('Passwords do not match');
      return;
    }
    try {
      const response = await authService.changePassword(values);
      setNotice(response.message);
      reset();
      clearSession();
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (error) {
      setApiError(getApiError(error));
    }
  };

  const updatePreferences = async (event) => {
    const form = new FormData(event.currentTarget);
    event.preventDefault();
    setApiError('');
    try {
      await operationsService.preferences({
        transaction: form.has('transaction'),
        loan: form.has('loan'),
        security: form.has('security'),
        account: form.has('account'),
      });
      setNotice('Notification preferences updated.');
    } catch (error) {
      setApiError(getApiError(error));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Protected profile
      </p>
      <h1 className="mt-3 text-4xl font-bold">Hello, {user.firstName}</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">Account identity</h2>
          <dl className="mt-5 space-y-4 text-sm">
            {[
              ['Name', `${user.firstName} ${user.lastName}`],
              ['Email', user.email],
              ['Role', user.role],
              ['Status', user.status],
            ].map(([label, value]) => (
              <div
                className="flex justify-between gap-4 border-b border-slate-100 pb-3"
                key={label}
              >
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium capitalize">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">Change password</h2>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit(changePassword)}>
            {notice && <Alert type="success">{notice}</Alert>}
            {apiError && <Alert>{apiError}</Alert>}
            <FormField
              label="Current password"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword', { required: 'Required' })}
              error={errors.currentPassword?.message}
            />
            <FormField
              label="New password"
              type="password"
              autoComplete="new-password"
              {...register('newPassword', {
                required: 'Required',
                minLength: { value: 12, message: 'Use at least 12 characters' },
              })}
              error={errors.newPassword?.message}
            />
            <FormField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword', { required: 'Required' })}
              error={errors.confirmPassword?.message}
            />
            <button
              className="rounded-lg bg-bank-700 px-5 py-2.5 font-semibold text-white disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Changing…' : 'Change password'}
            </button>
          </form>
        </section>
      </div>
      {user.role === 'customer' && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">Notification preferences</h2>
          <form className="mt-5 flex flex-wrap items-center gap-5" onSubmit={updatePreferences}>
            {['transaction', 'loan', 'security', 'account'].map((type) => (
              <label className="flex items-center gap-2 capitalize" key={type}>
                <input
                  className="h-4 w-4 accent-bank-700"
                  type="checkbox"
                  name={type}
                  defaultChecked={user.notificationPreferences?.[type] !== false}
                />
                {type} alerts
              </label>
            ))}
            <button className="rounded-lg bg-bank-700 px-5 py-2.5 font-semibold text-white">
              Save preferences
            </button>
          </form>
        </section>
      )}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="p-6">
          <h2 className="text-xl font-semibold">Recent login history</h2>
        </div>
        {history.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Result</th>
                  <th className="px-6 py-3">IP address</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr className="border-t border-slate-100" key={item._id}>
                    <td className="px-6 py-4">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 capitalize">{item.reason.replace('_', ' ')}</td>
                    <td className="px-6 py-4">{item.ipAddress || 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 pb-6 text-slate-500">No login history is available yet.</p>
        )}
      </section>
    </div>
  );
}
