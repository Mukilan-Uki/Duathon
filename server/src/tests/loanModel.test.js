import { describe, expect, it } from 'vitest';
import Loan from '../models/Loan.js';

describe('Loan financial invariants', () => {
  it('rejects fractional minor-unit balances', () => {
    const loan = new Loan({
      borrower: '507f1f77bcf86cd799439011',
      application: '507f1f77bcf86cd799439019',
      disbursementAccount: '507f1f77bcf86cd799439012',
      loanNumber: 'LN-2026-TEST',
      loanType: 'personal',
      principalMinor: 100000.5,
      interestRateBps: 1200,
      interestMinor: 12000,
      totalRepayableMinor: 112000,
      outstandingMinor: 112000,
      paidMinor: 0,
      monthlyInstallmentMinor: 9334,
      repaymentMonths: 12,
      disbursedAt: new Date(),
      nextPaymentDueAt: new Date(),
    });
    expect(loan.validateSync().errors.principalMinor).toBeDefined();
  });
});
