import { Link } from 'react-router-dom';

export default function AuthCard({ eyebrow, title, description, children, footer }) {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-12 sm:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 leading-7 text-slate-600">{description}</p>
        <div className="mt-7">{children}</div>
        {footer && <p className="mt-7 text-center text-sm text-slate-600">{footer}</p>}
      </div>
      <Link className="mt-6 block text-center text-sm font-medium text-bank-700" to="/">
        Return to home
      </Link>
    </div>
  );
}
