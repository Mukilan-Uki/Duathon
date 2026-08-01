const styles = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  available: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-200 text-slate-700',
  unavailable: 'bg-amber-100 text-amber-800',
  blocked: 'bg-red-100 text-red-800',
  suspended: 'bg-red-100 text-red-800',
  closed: 'bg-slate-200 text-slate-700',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  reversed: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-slate-200 text-slate-700',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status] || styles.closed}`}
    >
      {status}
    </span>
  );
}
