import { useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import FamilyPageHeader from '../../components/family/FamilyPageHeader';
import { useAuth } from '../../hooks/useAuth';
import { familyService } from '../../services/familyService';
import { getApiError } from '../../utils/apiError';

const permissionLabels = {
  viewSharedGoals: 'View shared goals',
  contributeToSharedGoals: 'Contribute to goals',
  manageJuniorAccounts: 'Manage junior accounts',
  approveJuniorTransactions: 'Approve junior transactions',
  viewJuniorTransactions: 'View junior transactions',
  manageFamilyMembers: 'Manage members',
  createFamilyAnnouncements: 'Create announcements',
};

export default function FamilyMembersPage() {
  const { user } = useAuth();
  const [family, setFamily] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    try {
      setFamily((await familyService.mine()).data.family);
    } catch (value) {
      setError(getApiError(value));
    }
  };
  useEffect(() => {
    load();
  }, []);
  const current = family?.members.find((m) => String(m.user?._id || m.user) === String(user?._id));
  const admin = current?.role === 'family_admin';
  const update = async (member, kind, value) => {
    setBusy(true);
    setError('');
    try {
      if (kind === 'role') await familyService.updateRole(family._id, member._id, value);
      else await familyService.updatePermissions(family._id, member._id, value);
      setMessage(`Member ${kind} updated.`);
      await load();
    } catch (reason) {
      setError(getApiError(reason, `Unable to update ${kind}`));
    } finally {
      setBusy(false);
    }
  };
  const confirmRemove = async () => {
    setBusy(true);
    try {
      await familyService.removeMember(family._id, remove._id);
      setRemove(null);
      setMessage('Member removed.');
      await load();
    } catch (reason) {
      setError(getApiError(reason, 'Unable to remove member'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <FamilyPageHeader
        title="Family members"
        description="Adult account balances remain private; these controls only grant explicit family permissions."
      />
      {(error || message) && (
        <div className="mt-6">
          <Alert type={error ? 'error' : 'success'}>{error || message}</Alert>
        </div>
      )}
      <div className="mt-8 grid gap-5">
        {family?.members
          ?.filter((m) => m.status === 'active')
          .map((member) => {
            const permissions = drafts[member._id] || member.permissions;
            return (
              <article className="rounded-2xl border bg-white p-5 shadow-card" key={member._id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {member.user?.firstName} {member.user?.lastName}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {member.relationship} · {member.role}
                    </p>
                  </div>
                  {admin && member._id !== current._id && (
                    <div className="flex gap-2">
                      <select
                        aria-label="Member role"
                        className="rounded-lg border p-2"
                        value={member.role}
                        onChange={(e) => update(member, 'role', e.target.value)}
                      >
                        <option value="adult_member">Adult member</option>
                        <option value="family_admin">Family admin</option>
                      </select>
                      <button
                        className="rounded-lg border border-red-300 px-3 text-red-700"
                        onClick={() => setRemove(member)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                {admin && member._id !== current._id && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(permissionLabels).map(([key, label]) => (
                      <label className="flex gap-2 text-sm" key={key}>
                        <input
                          checked={Boolean(permissions?.[key])}
                          type="checkbox"
                          onChange={(e) =>
                            setDrafts((all) => ({
                              ...all,
                              [member._id]: { ...permissions, [key]: e.target.checked },
                            }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                    <button
                      className="mt-2 rounded-lg bg-bank-700 px-3 py-2 font-semibold text-white disabled:opacity-60"
                      disabled={busy}
                      onClick={() => update(member, 'permissions', permissions)}
                    >
                      Save permissions
                    </button>
                  </div>
                )}
              </article>
            );
          }) || <p className="text-slate-600">You do not currently belong to a family.</p>}
      </div>
      <ConfirmationModal
        open={Boolean(remove)}
        title="Remove family member?"
        busy={busy}
        confirmLabel="Remove member"
        onCancel={() => setRemove(null)}
        onConfirm={confirmRemove}
      >
        Their historical activity will be preserved, but their family access will end.
      </ConfirmationModal>
    </div>
  );
}
