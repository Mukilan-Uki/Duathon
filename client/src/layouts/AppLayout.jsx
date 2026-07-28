import { Landmark, LockKeyhole } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AppLayout() {
  const { authenticated, user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            className="flex items-center gap-3 font-semibold"
            to="/"
            aria-label="Duothan Bank home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-bank-700 text-white">
              <Landmark size={21} aria-hidden="true" />
            </span>
            <span>Duothan Bank</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm" aria-label="Account">
            {authenticated ? (
              <>
                {user.role === 'customer' && (
                  <>
                    <Link className="font-medium text-slate-700" to="/accounts">
                      Accounts
                    </Link>
                    <Link className="hidden font-medium text-slate-700 md:block" to="/transfer">
                      Transfer
                    </Link>
                    <Link
                      className="hidden font-medium text-slate-700 lg:block"
                      to="/beneficiaries"
                    >
                      Beneficiaries
                    </Link>
                    <Link className="hidden font-medium text-slate-700 xl:block" to="/transactions">
                      Transactions
                    </Link>
                  </>
                )}
                {['employee', 'admin'].includes(user.role) && (
                  <Link className="font-medium text-slate-700" to="/account-reviews">
                    Reviews
                  </Link>
                )}
                <Link className="font-medium text-slate-700" to="/profile">
                  {user.firstName}
                </Link>
                <button className="font-semibold text-bank-700" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <span className="hidden items-center gap-2 text-slate-600 sm:flex">
                  <LockKeyhole size={16} className="text-bank-600" aria-hidden="true" />
                  Secure access
                </span>
                <Link className="font-semibold text-bank-700" to="/login">
                  Sign in
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
