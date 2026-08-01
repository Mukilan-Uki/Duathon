import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { operationsService } from '../../services/operationsService';

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState({ notifications: [], unread: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    let active = true;
    const poll = () =>
      operationsService
        .unreadNotifications({ page: 1, limit: 5 })
        .then((value) => active && setResult(value))
        .catch(() => {});
    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${result.unread} unread notifications`}
        className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-600"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Bell size={20} aria-hidden="true" />
        {result.unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-700 px-1 text-center text-xs font-bold text-white">
            {result.unread > 99 ? '99+' : result.unread}
          </span>
        )}
      </button>
      {open && (
        <section
          aria-label="Unread notifications"
          className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl"
        >
          <div className="border-b border-slate-100 px-4 py-3 font-semibold">Notifications</div>
          {result.notifications.length ? (
            result.notifications.map((item) => (
              <div className="border-b border-slate-100 px-4 py-3" key={item._id}>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.message}</p>
              </div>
            ))
          ) : (
            <p className="px-4 py-5 text-sm text-slate-500">You are all caught up.</p>
          )}
          <Link
            className="block px-4 py-3 text-center font-semibold text-bank-700"
            onClick={() => setOpen(false)}
            to="/notifications"
          >
            View all notifications
          </Link>
        </section>
      )}
    </div>
  );
}
