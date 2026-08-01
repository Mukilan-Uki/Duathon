export function maskAccountNumber(value) {
  return value ? `•••• •••• ${value.slice(-4)}` : '';
}

export function maskPersonName(user) {
  if (!user) return '';
  const maskPart = (value = '') =>
    value ? `${value[0]}${'•'.repeat(Math.min(Math.max(value.length - 1, 1), 4))}` : '';
  return `${maskPart(user.firstName)} ${maskPart(user.lastName)}`.trim();
}

export function escapeSearchRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
