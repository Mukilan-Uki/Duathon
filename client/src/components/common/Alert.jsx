export default function Alert({ type = 'error', children }) {
  const style =
    type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-red-200 bg-red-50 text-red-800';
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${style}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
