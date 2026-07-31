import { useState } from 'react';

export default function FormField({ label, error, ...inputProps }) {
  const id = inputProps.id || inputProps.name;
  const isPassword = inputProps.type === 'password';
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="relative mt-2 block">
        <input
          {...inputProps}
          type={isPassword && passwordVisible ? 'text' : inputProps.type}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-lg border border-slate-300 px-3.5 py-2.5 outline-none transition focus:border-bank-600 focus:ring-2 focus:ring-bank-50 ${isPassword ? 'pr-16' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-3 text-sm font-medium text-bank-700"
            aria-label={`${passwordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? 'Hide' : 'Show'}
          </button>
        )}
      </span>
      {error && (
        <span id={`${id}-error`} className="mt-1.5 block text-sm text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}
