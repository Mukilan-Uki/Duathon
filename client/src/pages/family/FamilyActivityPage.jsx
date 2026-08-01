import { useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import FamilyPageHeader from '../../components/family/FamilyPageHeader';
import { familyService } from '../../services/familyService';
import { getApiError } from '../../utils/apiError';

export default function FamilyActivityPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    familyService
      .mine()
      .then(({ data }) => (data.family ? familyService.dashboard(data.family._id) : null))
      .then((result) => setDashboard(result?.data || null))
      .catch((value) => setError(getApiError(value, 'Unable to load family activity')));
  }, []);
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <FamilyPageHeader
        title="Family activity"
        description="Announcements and an audit-backed history of family actions."
      />
      {error && (
        <div className="mt-6">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">Announcements</h2>
          <div className="mt-4 space-y-3">
            {dashboard?.announcements?.map((item) => (
              <article className="rounded-2xl border bg-white p-5" key={item._id}>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.message}</p>
                <time className="mt-2 block text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </article>
            ))}
            {dashboard && !dashboard.announcements.length && (
              <p className="text-slate-600">No announcements.</p>
            )}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Recent actions</h2>
          <div className="mt-4 space-y-3">
            {dashboard?.activity?.map((item) => (
              <article className="rounded-2xl border bg-white p-5" key={item._id}>
                <p className="font-medium">{item.action.replaceAll('_', ' ')}</p>
                <time className="text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </article>
            ))}
            {dashboard && !dashboard.activity.length && (
              <p className="text-slate-600">No recent activity.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
