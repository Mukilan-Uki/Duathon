import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectionTransaction: vi.fn(),
  accountFindOne: vi.fn(),
  accountFindOneAndUpdate: vi.fn(),
  applicationExists: vi.fn(),
  applicationCreate: vi.fn(),
  applicationFindById: vi.fn(),
  applicationFindOne: vi.fn(),
  loanCreate: vi.fn(),
  loanFindOne: vi.fn(),
  loanFindOneAndUpdate: vi.fn(),
  paymentFindOne: vi.fn(),
  paymentCreate: vi.fn(),
  transactionCreate: vi.fn(),
  audit: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock('mongoose', () => ({
  default: { connection: { transaction: mocks.connectionTransaction } },
}));
vi.mock('../models/Account.js', () => ({
  default: {
    findOne: mocks.accountFindOne,
    findOneAndUpdate: mocks.accountFindOneAndUpdate,
  },
}));
vi.mock('../models/LoanApplication.js', () => ({
  default: {
    exists: mocks.applicationExists,
    create: mocks.applicationCreate,
    findById: mocks.applicationFindById,
    findOne: mocks.applicationFindOne,
  },
}));
vi.mock('../models/Loan.js', () => ({
  default: {
    create: mocks.loanCreate,
    findOne: mocks.loanFindOne,
    findOneAndUpdate: mocks.loanFindOneAndUpdate,
  },
}));
vi.mock('../models/LoanPayment.js', () => ({
  default: {
    findOne: mocks.paymentFindOne,
    create: mocks.paymentCreate,
  },
}));
vi.mock('../models/Transaction.js', () => ({
  default: { create: mocks.transactionCreate },
}));
vi.mock('../services/auditService.js', () => ({
  createAuditLog: mocks.audit,
}));
vi.mock('../services/notificationService.js', () => ({
  createNotification: mocks.createNotification,
}));
vi.mock('../services/settingService.js', () => ({
  getNumericSetting: vi.fn((_key, fallback) => fallback),
}));

const { calculateLoanTerms, payLoan, reviewLoanApplication, submitLoanApplication } =
  await import('../services/loanService.js');

function queryResult(value) {
  return {
    select() {
      return this;
    },
    session() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

const userId = { toString: () => '507f1f77bcf86cd799439011' };
const reviewer = { _id: '507f1f77bcf86cd799439010', role: 'employee' };
const account = {
  _id: '507f1f77bcf86cd799439012',
  owner: userId,
  accountNumber: '601234567890',
  status: 'active',
  currency: 'LKR',
  availableBalanceMinor: 10000,
  ledgerBalanceMinor: 10000,
};
const metadata = { ip: '127.0.0.1', userAgent: 'test' };

describe('loan calculations and applications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates simple interest using integer minor units', () => {
    expect(calculateLoanTerms(120000, 1200, 12)).toEqual({
      interestMinor: 14400,
      totalRepayableMinor: 134400,
      monthlyInstallmentMinor: 11200,
    });
  });

  it('submits an application only against an active owned account', async () => {
    mocks.accountFindOne.mockReturnValue(queryResult(account));
    mocks.applicationExists.mockResolvedValue(false);
    mocks.applicationCreate.mockImplementation(async (value) => value);
    const result = await submitLoanApplication(userId, {
      disbursementAccountId: account._id,
      loanType: 'personal',
      requestedAmountMinor: 120000,
      purpose: 'Essential home improvements',
      repaymentMonths: 12,
    });
    expect(result).toMatchObject({
      applicant: userId,
      requestedAmountMinor: 120000,
      loanType: 'personal',
    });
  });
});

describe('loan review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectionTransaction.mockImplementation(async (callback) => callback({ id: 'session' }));
    mocks.transactionCreate.mockResolvedValue([]);
    mocks.loanCreate.mockImplementation(async (records) => [
      { _id: '507f1f77bcf86cd799439020', ...records[0] },
    ]);
    mocks.applicationFindOne.mockReturnValue(queryResult(null));
  });

  it('approves, disburses, records the loan, and audits in one transaction', async () => {
    const application = {
      _id: '507f1f77bcf86cd799439019',
      applicant: userId,
      disbursementAccount: account._id,
      loanType: 'personal',
      requestedAmountMinor: 120000,
      repaymentMonths: 12,
      status: 'pending',
      reviewNote: '',
      save: vi.fn(),
    };
    mocks.applicationFindById.mockReturnValue(queryResult(application));
    mocks.accountFindOne.mockReturnValue(queryResult(account));
    mocks.accountFindOneAndUpdate.mockReturnValue(
      queryResult({
        ...account,
        availableBalanceMinor: 130000,
        ledgerBalanceMinor: 130000,
      }),
    );

    const result = await reviewLoanApplication(
      application._id,
      reviewer,
      { decision: 'approve', reviewNote: 'Affordability checks passed' },
      metadata,
      'loan-review-key-1',
    );

    expect(result.loan.totalRepayableMinor).toBe(134400);
    expect(application.status).toBe('approved');
    expect(mocks.accountFindOneAndUpdate).toHaveBeenCalledOnce();
    expect(mocks.transactionCreate.mock.calls[0][0][0]).toMatchObject({
      type: 'deposit',
      direction: 'credit',
      amountMinor: 120000,
    });
    expect(mocks.audit).toHaveBeenCalledOnce();
  });

  it('records rejection without disbursing funds', async () => {
    const application = {
      _id: '507f1f77bcf86cd799439019',
      status: 'pending',
      reviewNote: '',
      save: vi.fn(),
    };
    mocks.applicationFindById.mockReturnValue(queryResult(application));
    await reviewLoanApplication(
      application._id,
      reviewer,
      { decision: 'reject', reviewNote: 'Insufficient affordability evidence' },
      metadata,
      'loan-review-key-2',
    );
    expect(application.status).toBe('rejected');
    expect(mocks.accountFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.loanCreate).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledOnce();
  });
});

describe('loan payments', () => {
  const loan = {
    _id: '507f1f77bcf86cd799439020',
    borrower: userId,
    loanNumber: 'LN-2026-ABCDEF',
    status: 'active',
    outstandingMinor: 5000,
    paidMinor: 1000,
    nextPaymentDueAt: new Date('2026-08-28T00:00:00.000Z'),
  };
  const input = { sourceAccountId: account._id, amountMinor: 2000 };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectionTransaction.mockImplementation(async (callback) => callback({ id: 'session' }));
    mocks.paymentFindOne.mockImplementation(() => queryResult(null));
    mocks.loanFindOne.mockReturnValue(queryResult(loan));
    mocks.accountFindOne.mockReturnValue(queryResult(account));
    mocks.accountFindOneAndUpdate.mockReturnValue(
      queryResult({
        ...account,
        availableBalanceMinor: 8000,
        ledgerBalanceMinor: 8000,
      }),
    );
    mocks.loanFindOneAndUpdate.mockReturnValue(
      queryResult({ ...loan, outstandingMinor: 3000, paidMinor: 3000 }),
    );
    mocks.paymentCreate.mockImplementation(async (records) => [
      { _id: '507f1f77bcf86cd799439030', ...records[0] },
    ]);
    mocks.transactionCreate.mockResolvedValue([]);
  });

  it('atomically debits the account and reduces outstanding balance', async () => {
    const result = await payLoan(userId, loan._id, input, 'loan-payment-key-1', metadata);
    expect(result.duplicate).toBe(false);
    expect(result.payment.outstandingAfterMinor).toBe(3000);
    expect(mocks.accountFindOneAndUpdate).toHaveBeenCalledOnce();
    expect(mocks.loanFindOneAndUpdate).toHaveBeenCalledOnce();
    expect(mocks.transactionCreate.mock.calls[0][0][0]).toMatchObject({
      type: 'loan_payment',
      direction: 'debit',
      amountMinor: 2000,
    });
  });

  it('rejects insufficient account balance before changing the loan', async () => {
    mocks.accountFindOneAndUpdate.mockReturnValue(queryResult(null));
    await expect(
      payLoan(userId, loan._id, input, 'loan-payment-key-2', metadata),
    ).rejects.toMatchObject({ statusCode: 422, message: 'Insufficient available balance' });
    expect(mocks.loanFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.paymentCreate).not.toHaveBeenCalled();
  });

  it('returns the first payment for an idempotent duplicate', async () => {
    const first = await payLoan(userId, loan._id, input, 'loan-payment-key-3', metadata);
    mocks.paymentFindOne.mockImplementation(() => queryResult(first.payment));
    const duplicate = await payLoan(userId, loan._id, input, 'loan-payment-key-3', metadata);
    expect(duplicate.duplicate).toBe(true);
    expect(mocks.connectionTransaction).toHaveBeenCalledTimes(1);
  });
});
