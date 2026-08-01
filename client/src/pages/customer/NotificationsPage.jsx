import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import DashboardLayout from '../../layouts/DashboardLayout';
import { operationsService } from '../../services/operationsService';
import { getApiError } from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const load = () =>
    operationsService
      .notifications({ page: 1, limit: 50 })
      .then(setResult)
      .catch((value) => setError(getApiError(value)));

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const read = async (id) => {
    try {
      await operationsService.readNotification(id);
      load();
    } catch (value) {
      setError(getApiError(value));
    }
  };
  const remove = async (id) => {
    try {
      await operationsService.deleteNotification(id);
      load();
    } catch (value) {
      setError(getApiError(value));
    }
  };
  const readAll = async () => {
    await operationsService.readAllNotifications();
    load();
  };

  return (
    <DashboardLayout role={user.role}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">Updates</p>
          <h1 className="mt-2 text-3xl font-bold">Notifications</h1>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
          onClick={readAll}
        >
          <CheckCheck size={17} /> Mark all read
        </button>
      </div>
      {error && (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      )}
      <section className="mt-7 space-y-3">
        {result?.notifications.length ? (
          result.notifications.map((item) => (
            <article
              className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left shadow-card ${item.readAt ? 'border-slate-200 bg-white' : 'border-bank-200 bg-bank-50'}`}
              key={item._id}
            >
              <Bell className="mt-1 shrink-0 text-bank-700" size={20} />
              <div className="flex-1">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                <div className="mt-3 flex gap-4">
                  {!item.readAt && (
                    <button
                      className="text-sm font-semibold text-bank-700"
                      onClick={() => read(item._id)}
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    aria-label={`Delete ${item.title}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-red-700"
                    onClick={() => remove(item._id)}
                  >
                    <Trash2 size={15} aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
              {!item.readAt && (
                <span className="rounded-full bg-bank-700 px-2 py-1 text-xs text-white">New</span>
              )}
            </article>
          ))
        ) : (
          <p className="rounded-2xl bg-white p-6 text-slate-500">No notifications yet.</p>
        )}
      </section>
    </DashboardLayout>
  );
}
