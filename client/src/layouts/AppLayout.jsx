import { Landmark, LockKeyhole } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a
            className="flex items-center gap-3 font-semibold"
            href="/"
            aria-label="Duothan Bank home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-bank-700 text-white">
              <Landmark size={21} aria-hidden="true" />
            </span>
            <span>Duothan Bank</span>
          </a>
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <LockKeyhole size={16} className="text-bank-600" aria-hidden="true" />
            Secure banking foundation
          </span>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
