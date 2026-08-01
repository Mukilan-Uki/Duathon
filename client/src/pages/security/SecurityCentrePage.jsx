import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { securityService } from '../../services/securityService';
import { getApiError } from '../../utils/apiError';

const riskClass = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
};
export default function SecurityCentrePage() {
  const { clearSession } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null);
  const [trustForm, setTrustForm] = useState({ password: '', deviceName: '' });
  const [renames, setRenames] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [password, setPassword] = useState('');
  const [preserveCurrent, setPreserveCurrent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const [all, active, logins] = await Promise.all([
        securityService.devices(),
        securityService.current(),
        authService.getLoginHistory(),
      ]);
      setDevices(all.data.devices);
      setCurrent(active.data.device);
      setHistory(logins.data.history);
    } catch (value) {
      setError(getApiError(value, 'Unable to load Security Centre'));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const trust = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await securityService.trust(trustForm);
      setNotice(response.message);
      setTrustForm({ password: '', deviceName: '' });
      await load();
    } catch (value) {
      setError(getApiError(value));
    } finally {
      setBusy(false);
    }
  };
  const rename = async (device) => {
    const name = renames[device._id] ?? device.deviceName;
    setBusy(true);
    try {
      await securityService.rename(device._id, name);
      setNotice('Device renamed.');
      await load();
    } catch (value) {
      setError(getApiError(value));
    } finally {
      setBusy(false);
    }
  };
  const logoutDevice = async (device) => {
    setBusy(true);
    try {
      await securityService.logout(device._id);
      if (device.current) {
        clearSession();
        navigate('/login', { replace: true });
        return;
      }
      setNotice('Device sessions terminated.');
      await load();
    } catch (value) {
      setError(getApiError(value));
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    setBusy(true);
    try {
      if (confirmation.type === 'revoke') {
        await securityService.revoke(confirmation.device._id, { password });
        if (confirmation.device.current) {
          clearSession();
          navigate('/login', { replace: true });
          return;
        }
        setNotice('Device trust removed.');
      } else {
        await securityService.logoutAll({ password, preserveCurrent });
        if (!preserveCurrent) {
          clearSession();
          navigate('/login', { replace: true });
          return;
        }
        setNotice('Other device sessions terminated.');
      }
      setConfirmation(null);
      setPassword('');
      await load();
    } catch (value) {
      setError(getApiError(value));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-bank-700">
        Account security
      </p>
      <h1 className="mt-2 text-3xl font-bold">Security Centre</h1>
      <p className="mt-2 text-slate-600">
        Review devices and terminate sessions you do not recognize.
      </p>
      {(error || notice) && (
        <div className="mt-5">
          <Alert type={error ? 'error' : 'success'}>{error || notice}</Alert>
        </div>
      )}
      {current && current.status !== 'trusted' && (
        <form
          className="mt-7 grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:grid-cols-3"
          onSubmit={trust}
        >
          <div>
            <h2 className="font-semibold">Trust this device</h2>
            <p className="text-sm text-slate-600">
              Confirm your password to trust it for future sign-ins.
            </p>
          </div>
          <input
            className="rounded-lg border p-3"
            placeholder="Device name"
            value={trustForm.deviceName}
            onChange={(e) => setTrustForm({ ...trustForm, deviceName: e.target.value })}
          />
          <div>
            <input
              className="w-full rounded-lg border p-3"
              type="password"
              autoComplete="current-password"
              placeholder="Current password"
              required
              value={trustForm.password}
              onChange={(e) => setTrustForm({ ...trustForm, password: e.target.value })}
            />
            <button
              className="mt-2 rounded-lg bg-bank-700 px-4 py-2 font-semibold text-white"
              disabled={busy}
            >
              Trust device
            </button>
          </div>
        </form>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Your devices</h2>
        <button
          className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700"
          onClick={() => setConfirmation({ type: 'all' })}
        >
          Sign out devices
        </button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {devices.map((device) => (
          <article
            className={`rounded-2xl border bg-white p-5 ${device.current ? 'ring-2 ring-bank-600' : ''}`}
            key={device._id}
          >
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  {device.deviceName}{' '}
                  {device.current && <span className="text-sm text-bank-700">(current)</span>}
                </h3>
                <p className="text-sm text-slate-600">
                  {device.browser} · {device.operatingSystem} · {device.deviceType}
                </p>
              </div>
              <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">
                {device.status}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Last active {new Date(device.lastSeenAt).toLocaleString()} · IP{' '}
              {device.lastLoginIp || 'Unavailable'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                aria-label={`Rename ${device.deviceName}`}
                className="min-w-0 flex-1 rounded-lg border p-2"
                value={renames[device._id] ?? device.deviceName}
                onChange={(e) => setRenames({ ...renames, [device._id]: e.target.value })}
              />
              <button
                className="rounded-lg border px-3 py-2 text-sm font-semibold"
                disabled={busy}
                onClick={() => rename(device)}
              >
                Rename
              </button>
              <button
                className="rounded-lg border px-3 py-2 text-sm font-semibold"
                disabled={busy}
                onClick={() => logoutDevice(device)}
              >
                Sign out
              </button>
              {device.status === 'trusted' && (
                <button
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700"
                  onClick={() => setConfirmation({ type: 'revoke', device })}
                >
                  Remove trust
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <h2 className="mt-10 text-2xl font-semibold">Recent sign-ins</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Result</th>
              <th className="p-3">Risk</th>
              <th className="p-3">IP</th>
              <th className="p-3">Signals</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr className="border-t" key={item._id}>
                <td className="p-3">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="p-3">{item.successful ? 'Successful' : item.reason}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${riskClass[item.riskLevel] || riskClass.low}`}
                  >
                    {item.riskLevel || 'low'}
                  </span>
                </td>
                <td className="p-3">{item.ipAddress || 'Unavailable'}</td>
                <td className="p-3">{item.riskReasons?.join(', ') || 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmationModal
        open={Boolean(confirmation)}
        busy={busy}
        title={
          confirmation?.type === 'all' ? 'Sign out device sessions?' : 'Remove trusted device?'
        }
        confirmLabel="Confirm security action"
        onCancel={() => {
          setConfirmation(null);
          setPassword('');
        }}
        onConfirm={confirm}
      >
        <p>This security-sensitive action requires your current password.</p>
        <input
          className="mt-3 w-full rounded-lg border p-3"
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {confirmation?.type === 'all' && (
          <label className="mt-3 flex gap-2">
            <input
              type="checkbox"
              checked={preserveCurrent}
              onChange={(e) => setPreserveCurrent(e.target.checked)}
            />
            Keep this session signed in
          </label>
        )}
      </ConfirmationModal>
    </div>
  );
}
