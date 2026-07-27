import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center">
      <p className="font-semibold text-bank-700">404</p>
      <h1 className="mt-3 text-4xl font-bold">Page not found</h1>
      <p className="mt-4 text-slate-600">The requested page does not exist.</p>
      <Link
        className="mt-8 inline-block rounded-lg bg-bank-700 px-5 py-3 font-medium text-white"
        to="/"
      >
        Return home
      </Link>
    </div>
  );
}
