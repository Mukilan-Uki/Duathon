import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import DashboardLayout from '../../layouts/DashboardLayout';
import { operationsService } from '../../services/operationsService';
import { getApiError } from '../../utils/apiError';

export default function NotificationsPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const load = () =>
    operationsService
      .notifications({ page: 1, limit: 50 })
      .then(setResult)
      .catch((value) => setError(getApiError(value)));

  useEffect(load, []);

  const read = async (id) => {
    await operationsService.readNotification(id);
    load();
  };
  const readAll = async () => {
    await operationsService.readAllNotifications();
    load();
  };

  return (
    <DashboardLayout role="customer">
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
            <button
              className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left shadow-card ${item.readAt ? 'border-slate-200 bg-white' : 'border-bank-200 bg-bank-50'}`}
              key={item._id}
              onClick={() => !item.readAt && read(item._id)}
            >
              <Bell className="mt-1 shrink-0 text-bank-700" size={20} />
              <span className="flex-1">
                <span className="block font-semibold">{item.title}</span>
                <span className="mt-1 block text-sm text-slate-600">{item.message}</span>
                <span className="mt-2 block text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </span>
              {!item.readAt && (
                <span className="rounded-full bg-bank-700 px-2 py-1 text-xs text-white">New</span>
              )}
            </button>
          ))
        ) : (
          <p className="rounded-2xl bg-white p-6 text-slate-500">No notifications yet.</p>
        )}
      </section>
    </DashboardLayout>
  );
}
