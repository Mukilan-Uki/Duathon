import { useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import FamilyPageHeader from '../../components/family/FamilyPageHeader';
import { familyService } from '../../services/familyService';
import { getApiError } from '../../utils/apiError';

export default function FamilyInvitationsPage() {
  const [invitations, setInvitations] = useState([]);
  const [sent, setSent] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const [mine, family] = await Promise.all([
        familyService.myInvitations(),
        familyService.mine(),
      ]);
      setInvitations(mine.data.invitations);
      if (family.data.family) {
        try {
          const result = await familyService.familyInvitations(family.data.family._id);
          setSent(result.data.invitations);
        } catch {
          setSent([]);
        }
      }
    } catch (value) {
      setError(getApiError(value, 'Unable to load invitations'));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id, action) => {
    setBusy(id);
    setError('');
    try {
      const response =
        action === 'cancel'
          ? await familyService.cancelInvitation(id)
          : await familyService.respond(id, action);
      setNotice(response.message);
      await load();
    } catch (value) {
      setError(getApiError(value, 'Unable to update invitation'));
    } finally {
      setBusy('');
    }
  };

  const Card = ({ invitation, outgoing = false }) => (
    <article className="rounded-2xl border bg-white p-5 shadow-card">
      <h2 className="font-semibold">
        {invitation.family?.name || invitation.email || 'Family invitation'}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {invitation.relationship} · {invitation.status}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Expires {new Date(invitation.expiresAt).toLocaleDateString()}
      </p>
      {invitation.status === 'pending' && (
        <div className="mt-4 flex gap-2">
          {outgoing ? (
            <button
              className="rounded-lg border px-3 py-2 text-sm font-semibold"
              disabled={busy === invitation._id}
              onClick={() => act(invitation._id, 'cancel')}
            >
              Cancel
            </button>
          ) : (
            <>
              <button
                className="rounded-lg bg-bank-700 px-3 py-2 text-sm font-semibold text-white"
                disabled={busy === invitation._id}
                onClick={() => act(invitation._id, 'accept')}
              >
                Accept
              </button>
              <button
                className="rounded-lg border px-3 py-2 text-sm font-semibold"
                disabled={busy === invitation._id}
                onClick={() => act(invitation._id, 'reject')}
              >
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <FamilyPageHeader
        title="Family invitations"
        description="Review invitations you received and invitations sent by your family."
      />
      {(error || notice) && (
        <div className="mt-6">
          <Alert type={error ? 'error' : 'success'}>{error || notice}</Alert>
        </div>
      )}
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Received</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {invitations.length ? (
            invitations.map((item) => <Card invitation={item} key={item._id} />)
          ) : (
            <p className="text-slate-600">No invitations received.</p>
          )}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Sent</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {sent.length ? (
            sent.map((item) => <Card invitation={item} outgoing key={item._id} />)
          ) : (
            <p className="text-slate-600">No managed invitations.</p>
          )}
        </div>
      </section>
    </div>
  );
}
