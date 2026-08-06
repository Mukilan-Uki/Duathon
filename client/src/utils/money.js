export function formatMinorUnits(value, currency = 'LKR') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value / 100);
}

export function minorToMajorInput(valueMinor) {
  const minor = BigInt(Math.trunc(valueMinor));
  const whole = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

export function maskAccountNumber(accountNumber) {
  if (!accountNumber) return '';
  const digits = String(accountNumber);
  return digits.length <= 4 ? digits : `••••${digits.slice(-4)}`;
}

export function parseMajorUnitsToMinor(value) {
  const normalized = value.trim().replace(/^\./, '0.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Enter a valid amount with no more than two decimal places');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Enter a valid positive amount');
  }
  return Number(minor);
}
