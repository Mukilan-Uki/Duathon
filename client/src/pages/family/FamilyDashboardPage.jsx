import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import FamilyPageHeader from '../../components/family/FamilyPageHeader';
import { useAuth } from '../../hooks/useAuth';
import { familyService } from '../../services/familyService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

export default function FamilyDashboardPage() {
  const { user } = useAuth();
  const [family, setFamily] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [name, setName] = useState('');
  const [invite, setInvite] = useState({ email: '', relationship: '' });
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const mine = await familyService.mine();
      const nextFamily = mine.data.family;
      setFamily(nextFamily);
      setDashboard(nextFamily ? (await familyService.dashboard(nextFamily._id)).data : null);
    } catch (value) {
      setError(getApiError(value, 'Unable to load Family Banking'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await familyService.create(name);
      setNotice('Family created successfully.');
      setName('');
      await load();
    } catch (value) {
      setError(getApiError(value, 'Unable to create family'));
    } finally {
      setBusy(false);
    }
  };

  const sendInvitation = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await familyService.invite(family._id, invite);
      setNotice(response.message);
      setInvite({ email: '', relationship: '' });
      await load();
    } catch (value) {
      setError(getApiError(value, 'Unable to send invitation'));
    } finally {
      setBusy(false);
    }
  };

  const publish = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await familyService.announce(family._id, announcement);
      setAnnouncement({ title: '', message: '' });
      setNotice('Family announcement published.');
      await load();
    } catch (value) {
      setError(getApiError(value, 'Unable to publish announcement'));
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-slate-600" role="status">
        Loading Family Banking…
      </div>
    );

  const currentMember = family?.members.find(
    (member) => String(member.user?._id || member.user) === String(user?._id),
  );
  const canManage = currentMember?.role === 'family_admin';
  const canAnnounce = canManage || currentMember?.permissions?.createFamilyAnnouncements;

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <FamilyPageHeader
        title={family?.name || 'Create your family'}
        description="Share goals and coordinate family finances without exposing private adult accounts."
      />
      {(error || notice) && (
        <div className="mt-6">
          <Alert type={error ? 'error' : 'success'}>{error || notice}</Alert>
        </div>
      )}
      {!family ? (
        <section className="mt-8 max-w-xl rounded-2xl border bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">Start Family Banking</h2>
          <p className="mt-2 text-sm text-slate-600">
            You must be an active, verified adult customer.
          </p>
          <form className="mt-5 space-y-4" onSubmit={create}>
            <label className="block text-sm font-medium" htmlFor="family-name">
              Family name
            </label>
            <input
              id="family-name"
              className="w-full rounded-lg border p-3"
              minLength="3"
              maxLength="80"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              className="rounded-lg bg-bank-700 px-5 py-3 font-semibold text-white disabled:opacity-60"
              disabled={busy}
            >
              Create family
            </button>
          </form>
          <Link className="mt-5 inline-flex font-semibold text-bank-700" to="/family/invitations">
            View invitations instead
          </Link>
        </section>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Active members', dashboard?.activeMembers || 0],
              ['Pending invitations', dashboard?.pendingInvitations || 0],
              ['Shared goals', dashboard?.goals?.length || 0],
              ['Total contributions', formatMinorUnits(dashboard?.totalContributionsMinor || 0)],
            ].map(([label, value]) => (
              <article className="rounded-2xl border bg-white p-5 shadow-card" key={label}>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-sm text-slate-500">
            Family code: <span className="font-mono font-semibold">{family.familyCode}</span>
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {canManage && (
              <section className="rounded-2xl border bg-white p-6 shadow-card">
                <h2 className="text-xl font-semibold">Invite an adult member</h2>
                <form className="mt-4 space-y-4" onSubmit={sendInvitation}>
                  <input
                    aria-label="Member email"
                    className="w-full rounded-lg border p-3"
                    placeholder="member@example.com"
                    type="email"
                    required
                    value={invite.email}
                    onChange={(event) =>
                      setInvite((value) => ({ ...value, email: event.target.value }))
                    }
                  />
                  <input
                    aria-label="Relationship"
                    className="w-full rounded-lg border p-3"
                    placeholder="Relationship"
                    minLength="2"
                    maxLength="40"
                    required
                    value={invite.relationship}
                    onChange={(event) =>
                      setInvite((value) => ({ ...value, relationship: event.target.value }))
                    }
                  />
                  <button
                    className="rounded-lg bg-bank-700 px-5 py-3 font-semibold text-white disabled:opacity-60"
                    disabled={busy}
                  >
                    Send invitation
                  </button>
                </form>
              </section>
            )}
            {canAnnounce && (
              <section className="rounded-2xl border bg-white p-6 shadow-card">
                <h2 className="text-xl font-semibold">Family announcement</h2>
                <form className="mt-4 space-y-4" onSubmit={publish}>
                  <input
                    aria-label="Announcement title"
                    className="w-full rounded-lg border p-3"
                    placeholder="Title"
                    minLength="3"
                    maxLength="100"
                    required
                    value={announcement.title}
                    onChange={(event) =>
                      setAnnouncement((value) => ({ ...value, title: event.target.value }))
                    }
                  />
                  <textarea
                    aria-label="Announcement message"
                    className="w-full rounded-lg border p-3"
                    placeholder="Message"
                    minLength="5"
                    maxLength="500"
                    required
                    value={announcement.message}
                    onChange={(event) =>
                      setAnnouncement((value) => ({ ...value, message: event.target.value }))
                    }
                  />
                  <button
                    className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60"
                    disabled={busy}
                  >
                    Publish announcement
                  </button>
                </form>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
