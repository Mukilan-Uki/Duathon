import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accountFindOne: vi.fn(),
  accountFindOneAndUpdate: vi.fn(),
  transactionFindOne: vi.fn(),
  transactionCreate: vi.fn(),
  connectionTransaction: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock('mongoose', () => ({
  default: {
    connection: {
      transaction: mocks.connectionTransaction,
    },
  },
}));

vi.mock('../models/Account.js', () => ({
  default: {
    findOne: mocks.accountFindOne,
    findOneAndUpdate: mocks.accountFindOneAndUpdate,
  },
}));

vi.mock('../models/Transaction.js', () => ({
  default: {
    findOne: mocks.transactionFindOne,
    create: mocks.transactionCreate,
  },
}));

vi.mock('../services/auditService.js', () => ({
  createAuditLog: mocks.createAuditLog,
}));

const { transferMoney } = await import('../services/transactionService.js');

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

const senderId = {
  toString: () => '507f1f77bcf86cd799439012',
  equals: (other) => other === senderId,
};
const receiverId = {
  toString: () => '507f1f77bcf86cd799439013',
  equals: (other) => other === receiverId,
};
const userId = { toString: () => '507f1f77bcf86cd799439011' };
const receiverOwner = { toString: () => '507f1f77bcf86cd799439014' };
const input = {
  senderAccountId: '507f1f77bcf86cd799439012',
  receiverAccountNumber: '609876543210',
  amountMinor: 2500,
  description: 'Invoice payment',
};
const metadata = { ip: '127.0.0.1', userAgent: 'test' };

function arrangeAccounts({ sufficient = true } = {}) {
  const sender = {
    _id: senderId,
    owner: userId,
    accountNumber: '601234567890',
    currency: 'LKR',
    status: 'active',
    availableBalanceMinor: 10000,
    ledgerBalanceMinor: 10000,
  };
  const receiver = {
    _id: receiverId,
    owner: receiverOwner,
    accountNumber: '609876543210',
    currency: 'LKR',
    status: 'active',
    availableBalanceMinor: 3000,
    ledgerBalanceMinor: 3000,
  };
  mocks.accountFindOne
    .mockReturnValueOnce(queryResult(sender))
    .mockReturnValueOnce(queryResult(receiver));
  mocks.accountFindOneAndUpdate
    .mockReturnValueOnce(
      queryResult(
        sufficient ? { ...sender, availableBalanceMinor: 7500, ledgerBalanceMinor: 7500 } : null,
      ),
    )
    .mockReturnValueOnce(
      queryResult({ ...receiver, availableBalanceMinor: 5500, ledgerBalanceMinor: 5500 }),
    );
}

describe('transaction service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectionTransaction.mockImplementation(async (callback) => callback({ id: 'session' }));
    mocks.transactionFindOne.mockImplementation(() => queryResult(null));
    mocks.transactionCreate.mockImplementation(async (records) =>
      records.map((record, index) => ({ _id: `transaction-${index}`, ...record })),
    );
  });

  it('atomically debits, credits, records both sides, and audits a successful transfer', async () => {
    arrangeAccounts();
    const result = await transferMoney(userId, input, 'transfer-key-001', metadata);

    expect(result.duplicate).toBe(false);
    expect(mocks.accountFindOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.transactionCreate.mock.calls[0][0]).toHaveLength(2);
    expect(mocks.transactionCreate.mock.calls[0][0][0]).toMatchObject({
      direction: 'sent',
      amountMinor: 2500,
      balanceAfterMinor: 7500,
    });
    expect(mocks.transactionCreate.mock.calls[0][0][1]).toMatchObject({
      direction: 'received',
      balanceAfterMinor: 5500,
    });
    expect(mocks.createAuditLog).toHaveBeenCalledOnce();
  });

  it('rejects insufficient balance before crediting or creating records', async () => {
    arrangeAccounts({ sufficient: false });
    await expect(transferMoney(userId, input, 'transfer-key-002', metadata)).rejects.toMatchObject({
      statusCode: 422,
      message: 'Insufficient available balance',
    });
    expect(mocks.accountFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.transactionCreate).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it('returns the completed result for a duplicate submission without moving money twice', async () => {
    arrangeAccounts();
    const first = await transferMoney(userId, input, 'transfer-key-003', metadata);
    mocks.transactionFindOne.mockImplementation(() => queryResult(first.transaction));

    const duplicate = await transferMoney(userId, input, 'transfer-key-003', metadata);
    expect(duplicate.duplicate).toBe(true);
    expect(mocks.connectionTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.accountFindOneAndUpdate).toHaveBeenCalledTimes(2);
  });
});
