import crypto from 'node:crypto';

function suffix() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

export function generateLoanNumber() {
  return `LN-${new Date().getUTCFullYear()}-${suffix()}`;
}

export function generateLoanPaymentReference() {
  return `LP-${Date.now()}-${suffix()}`;
}
