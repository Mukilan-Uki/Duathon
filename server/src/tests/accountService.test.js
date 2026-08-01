import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accountFindById: vi.fn(),
  createAuditLog: vi.fn(),
  createNotification: vi.fn(),
  generateUniqueAccountNumber: vi.fn(),
}));

vi.mock('../models/Account.js', () => ({
  default: { findById: mocks.accountFindById },
}));
vi.mock('../models/Transaction.js', () => ({ default: {} }));
vi.mock('../utils/accountNumber.js', () => ({
  generateUniqueAccountNumber: mocks.generateUniqueAccountNumber,
}));
vi.mock('../services/auditService.js', () => ({ createAuditLog: mocks.createAuditLog }));
vi.mock('../services/notificationService.js', () => ({
  createNotification: mocks.createNotification,
}));

const { approveAccount } = await import('../services/accountService.js');

function selected(value) {
  return {
    select: vi.fn().mockResolvedValue(value),
  };
}

describe('account approval compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateUniqueAccountNumber.mockResolvedValue('699900001234');
  });

  it('backfills required Phase 3 fields when approving a legacy application', async () => {
    const ownerId = '507f1f77bcf86cd799439011';
    const account = {
      _id: '507f1f77bcf86cd799439012',
      owner: ownerId,
      accountType: 'savings',
      status: 'pending',
      createdBy: undefined,
      branchCode: undefined,
      ledgerBalanceMinor: 0,
      availableBalanceMinor: 0,
      currency: 'LKR',
      save: vi.fn().mockResolvedValue(undefined),
    };
    mocks.accountFindById.mockReturnValue(selected(account));

    await approveAccount(
      account._id,
      { _id: '507f1f77bcf86cd799439013', role: 'employee' },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(account).toMatchObject({
      createdBy: ownerId,
      branchCode: 'CMB01',
      status: 'active',
      accountNumber: '699900001234',
    });
    expect(account.save).toHaveBeenCalledOnce();
    expect(mocks.createAuditLog).toHaveBeenCalledOnce();
    expect(mocks.createNotification).toHaveBeenCalledOnce();
  });
});
