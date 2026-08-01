import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accountFindOne: vi.fn(),
  accountFindOneAndUpdate: vi.fn(),
  transactionFindOne: vi.fn(),
  transactionCreate: vi.fn(),
  transactionAggregate: vi.fn(),
  connectionTransaction: vi.fn(),
  createAuditLog: vi.fn(),
  createNotification: vi.fn(),
  suspiciousCreate: vi.fn(),
}));

vi.mock('mongoose', () => ({
  default: {
    Types: { ObjectId: class ObjectId {} },
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
    aggregate: mocks.transactionAggregate,
  },
}));
vi.mock('../models/SuspiciousActivity.js', () => ({
  default: { create: mocks.suspiciousCreate },
}));

vi.mock('../services/auditService.js', () => ({
  createAuditLog: mocks.createAuditLog,
}));
vi.mock('../services/notificationService.js', () => ({
  createNotification: mocks.createNotification,
}));
vi.mock('../services/settingService.js', () => ({
  getNumericSetting: vi.fn((_key, fallback) => fallback),
}));

const { createReversalFoundation, transferMoney } =
  await import('../services/transactionService.js');

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
    mocks.transactionAggregate.mockImplementation(() => queryResult([]));
    mocks.transactionCreate.mockImplementation(async (records) => {
      if (!Array.isArray(records)) return { _id: 'failed-transaction', ...records };
      return records.map((record, index) => ({
        _id: `transaction-${index}`,
        ...record,
        save: vi.fn().mockResolvedValue(undefined),
      }));
    });
  });

  it('atomically debits, credits, completes one transfer record, and audits it', async () => {
    arrangeAccounts();
    const result = await transferMoney(userId, input, 'transfer-key-001', metadata);

    expect(result.duplicate).toBe(false);
    expect(mocks.accountFindOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.transactionCreate.mock.calls[0][0]).toHaveLength(1);
    expect(mocks.transactionCreate.mock.calls[0][0][0]).toMatchObject({
      direction: 'sent',
      amountMinor: 2500,
      status: 'pending',
    });
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(2);
  });

  it('rejects insufficient balance, skips the credit, and records a safe failure', async () => {
    arrangeAccounts({ sufficient: false });
    await expect(transferMoney(userId, input, 'transfer-key-002', metadata)).rejects.toMatchObject({
      statusCode: 422,
      message: 'Insufficient available balance',
    });
    expect(mocks.accountFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.transactionCreate).toHaveBeenCalledTimes(2);
    expect(mocks.transactionCreate.mock.calls[1][0]).toMatchObject({ status: 'failed' });
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(2);
  });

  it('rejects reuse of an idempotency key with different transfer data', async () => {
    mocks.transactionFindOne.mockImplementation(() =>
      queryResult({ requestHash: 'different-fingerprint' }),
    );
    await expect(transferMoney(userId, input, 'transfer-key-004', metadata)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mocks.connectionTransaction).not.toHaveBeenCalled();
  });

  it('rejects a transfer when the daily amount limit is exceeded', async () => {
    mocks.transactionAggregate.mockImplementation(() =>
      queryResult([{ total: 250000000, count: 1 }]),
    );
    await expect(transferMoney(userId, input, 'transfer-key-005', metadata)).rejects.toMatchObject({
      message: 'Daily transfer amount limit exceeded',
    });
  });

  it('rolls back when the receiver becomes inactive after the debit', async () => {
    arrangeAccounts();
    mocks.accountFindOneAndUpdate
      .mockReset()
      .mockReturnValueOnce(queryResult({ availableBalanceMinor: 7500 }))
      .mockReturnValueOnce(queryResult(null));
    await expect(transferMoney(userId, input, 'transfer-key-006', metadata)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mocks.connectionTransaction).toHaveBeenCalledOnce();
    expect(mocks.transactionCreate.mock.calls.at(-1)[0]).toMatchObject({ status: 'failed' });
  });

  it('allows only one simulated concurrent transfer to consume the remaining balance', async () => {
    const sender = {
      _id: senderId,
      owner: userId,
      accountNumber: '601234567890',
      currency: 'LKR',
      status: 'active',
      availableBalanceMinor: 2500,
      ledgerBalanceMinor: 2500,
    };
    const receiver = {
      _id: receiverId,
      owner: receiverOwner,
      accountNumber: '609876543210',
      currency: 'LKR',
      status: 'active',
      availableBalanceMinor: 0,
      ledgerBalanceMinor: 0,
    };
    mocks.accountFindOne.mockImplementation((query) => queryResult(query._id ? sender : receiver));
    let debitAttempts = 0;
    mocks.accountFindOneAndUpdate.mockImplementation((query) => {
      if (query.owner) {
        debitAttempts += 1;
        return queryResult(
          debitAttempts === 1
            ? { ...sender, availableBalanceMinor: 0, ledgerBalanceMinor: 0 }
            : null,
        );
      }
      return queryResult({ ...receiver, availableBalanceMinor: 2500, ledgerBalanceMinor: 2500 });
    });

    const results = await Promise.allSettled([
      transferMoney(userId, input, 'concurrent-key-1', metadata),
      transferMoney(userId, input, 'concurrent-key-2', metadata),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(debitAttempts).toBe(2);
  });

  it('returns the completed result for a duplicate submission without moving money twice', async () => {
    arrangeAccounts();
    await transferMoney(userId, input, 'transfer-key-003', metadata);
    const stored = {
      _id: 'transaction-0',
      ...mocks.transactionCreate.mock.calls[0][0][0],
      status: 'completed',
    };
    mocks.transactionFindOne.mockImplementation(() => queryResult(stored));

    const duplicate = await transferMoney(userId, input, 'transfer-key-003', metadata);
    expect(duplicate.duplicate).toBe(true);
    expect(mocks.connectionTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.accountFindOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('requires an administrator and reason before starting a reversal', async () => {
    await expect(
      createReversalFoundation('transaction-1', { role: 'employee' }, 'Bank correction', metadata),
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      createReversalFoundation('transaction-1', { role: 'admin', _id: 'admin-id' }, '', metadata),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(mocks.connectionTransaction).not.toHaveBeenCalled();
  });
});
