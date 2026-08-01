import {
  ArrowLeftRight,
  Bell,
  CreditCard,
  FileCheck2,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  SearchCheck,
  Settings,
  UserRound,
  UsersRound,
  WalletCards,
  Baby,
  ShieldCheck,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const menus = {
  customer: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/accounts', label: 'Accounts', icon: CreditCard },
    { to: '/transfer', label: 'Send money', icon: ArrowLeftRight },
    { to: '/transactions', label: 'Transactions', icon: ReceiptText },
    { to: '/beneficiaries', label: 'Beneficiaries', icon: UsersRound },
    { to: '/loans', label: 'Loans', icon: WalletCards },
    { to: '/family', label: 'Family Banking', icon: UsersRound },
    { to: '/junior', label: 'Junior Banking', icon: Baby },
    { to: '/guardian/junior', label: 'Guardian controls', icon: ShieldCheck },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: UserRound },
    { to: '/security', label: 'Security Centre', icon: ShieldCheck },
  ],
  employee: [
    { to: '/employee/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/account-reviews', label: 'Account reviews', icon: FileCheck2 },
    { to: '/loan-reviews', label: 'Loan reviews', icon: WalletCards },
    { to: '/transaction-monitoring', label: 'Monitoring', icon: SearchCheck },
    { to: '/profile', label: 'Profile', icon: UserRound },
    { to: '/security', label: 'Security Centre', icon: ShieldCheck },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/account-reviews', label: 'Account reviews', icon: FileCheck2 },
    { to: '/loan-reviews', label: 'Loan reviews', icon: WalletCards },
    { to: '/transaction-monitoring', label: 'Monitoring', icon: SearchCheck },
    { to: '/admin/operations', label: 'System & audit', icon: Settings },
    { to: '/profile', label: 'Profile', icon: UserRound },
    { to: '/security', label: 'Security Centre', icon: ShieldCheck },
  ],
};

export default function DashboardLayout({ role, children }) {
  return (
    <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-slate-200 bg-slate-900 text-white lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-5 py-5 font-semibold lg:px-6">
          <Landmark size={18} aria-hidden="true" />
          <span className="capitalize">{role} banking</span>
        </div>
        <nav
          className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:overflow-visible lg:px-3"
          aria-label={`${role} dashboard`}
        >
          {menus[role].map(({ to, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
              to={to}
              key={to}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 p-5 sm:p-8 xl:p-10">{children}</div>
    </div>
  );
}
