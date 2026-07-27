import { Activity, Database, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getHealth } from '../services/healthService';

const foundations = [
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    text: 'Layered HTTP safeguards and environment-based secrets.',
  },
  {
    icon: Database,
    title: 'Reliable data layer',
    text: 'MongoDB readiness with monitored connection health.',
  },
  {
    icon: Activity,
    title: 'Observable services',
    text: 'A consistent health API and structured request logging.',
  },
];

export default function HomePage() {
  const [health, setHealth] = useState({ state: 'loading', database: 'checking' });
  useEffect(() => {
    getHealth()
      .then((data) => setHealth({ state: 'online', database: data.database }))
      .catch(() => setHealth({ state: 'offline', database: 'unavailable' }));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <section className="grid items-center gap-12 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-bank-700">
            Phase 1 · Rebuild
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Banking infrastructure people can trust.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            A secure, resilient foundation for customer, employee, and administrator banking
            experiences.
          </p>
        </div>
        <aside
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-slate-500">Platform status</p>
          <div className="mt-4 flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${health.state === 'online' ? 'bg-emerald-500' : health.state === 'loading' ? 'bg-amber-400' : 'bg-red-500'}`}
            />
            <span className="text-xl font-semibold capitalize">{health.state}</span>
          </div>
          <div className="mt-6 flex justify-between border-t border-slate-100 pt-5 text-sm">
            <span className="text-slate-500">Database</span>
            <span className="font-medium capitalize">{health.database}</span>
          </div>
        </aside>
      </section>
      <section className="mt-16 grid gap-5 md:grid-cols-3" aria-label="Platform foundations">
        {foundations.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <Icon className="text-bank-700" aria-hidden="true" />
            <h2 className="mt-5 text-lg font-semibold">{title}</h2>
            <p className="mt-2 leading-7 text-slate-600">{text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
