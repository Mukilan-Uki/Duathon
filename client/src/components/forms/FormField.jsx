export default function FormField({ label, error, ...inputProps }) {
  const id = inputProps.id || inputProps.name;
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 outline-none transition focus:border-bank-600 focus:ring-2 focus:ring-bank-50"
      />
      {error && (
        <span id={`${id}-error`} className="mt-1.5 block text-sm text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}
