import { describe, expect, it } from 'vitest';
import Account from '../models/Account.js';

describe('Account financial invariants', () => {
  const baseAccount = {
    owner: '507f1f77bcf86cd799439011',
    accountNumber: '601234567890',
    accountType: 'savings',
  };

  it('accepts integer minor-unit balances', () => {
    const account = new Account({
      ...baseAccount,
      ledgerBalanceMinor: 1050,
      availableBalanceMinor: 1050,
    });
    expect(account.validateSync()).toBeUndefined();
  });

  it('rejects fractional balances', () => {
    const account = new Account({
      ...baseAccount,
      ledgerBalanceMinor: 10.5,
      availableBalanceMinor: 10.5,
    });
    const error = account.validateSync();
    expect(error.errors.ledgerBalanceMinor).toBeDefined();
    expect(error.errors.availableBalanceMinor).toBeDefined();
  });
});
