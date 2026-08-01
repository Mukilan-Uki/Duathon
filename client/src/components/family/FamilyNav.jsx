import { NavLink } from 'react-router-dom';

const links = [
  ['/family', 'Overview'],
  ['/family/invitations', 'Invitations'],
  ['/family/members', 'Members'],
  ['/family/goals', 'Savings goals'],
  ['/family/activity', 'Activity'],
];

export default function FamilyNav() {
  return (
    <nav aria-label="Family Banking" className="mt-6 flex gap-2 overflow-x-auto pb-2">
      {links.map(([to, label]) => (
        <NavLink
          className={({ isActive }) =>
            `shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${isActive ? 'bg-bank-700 text-white' : 'border border-slate-300 bg-white text-slate-700'}`
          }
          end={to === '/family'}
          key={to}
          to={to}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
