export default function SummaryCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
        </div>
        {Icon && (
          <span className="rounded-xl bg-bank-50 p-2.5 text-bank-700">
            <Icon size={20} aria-hidden="true" />
          </span>
        )}
      </div>
    </article>
  );
}
