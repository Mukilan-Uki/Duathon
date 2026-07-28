import crypto from 'node:crypto';

export function generateTransferReference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `TRF-${date}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}
