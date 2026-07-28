import crypto from 'node:crypto';
import Account from '../models/Account.js';
import { AppError } from './AppError.js';

function randomDigits(length) {
  let value = '';
  while (value.length < length) value += crypto.randomInt(0, 10).toString();
  return value;
}

export async function generateUniqueAccountNumber(maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = `60${randomDigits(10)}`;
    if (!(await Account.exists({ accountNumber: candidate }))) return candidate;
  }
  throw new AppError('Unable to allocate an account number. Please try again', 503);
}
