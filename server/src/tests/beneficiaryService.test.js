import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accountFindOne: vi.fn(),
  beneficiaryExists: vi.fn(),
  beneficiaryCreate: vi.fn(),
  beneficiaryFindOneAndDelete: vi.fn(),
  beneficiaryFind: vi.fn(),
}));

vi.mock('../models/Account.js', () => ({
  default: { findOne: mocks.accountFindOne },
}));

vi.mock('../models/Beneficiary.js', () => ({
  default: {
    exists: mocks.beneficiaryExists,
    create: mocks.beneficiaryCreate,
    findOneAndDelete: mocks.beneficiaryFindOneAndDelete,
    find: mocks.beneficiaryFind,
  },
}));

const { addBeneficiary, removeBeneficiary } = await import('../services/beneficiaryService.js');

function queryResult(value) {
  return {
    select() {
      return this;
    },
    populate() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

const customerId = { toString: () => '507f1f77bcf86cd799439011' };
const otherCustomerId = {
  toString: () => '507f1f77bcf86cd799439014',
};
const activeAccount = {
  _id: '507f1f77bcf86cd799439012',
  accountNumber: '609876543210',
  status: 'active',
  owner: {
    _id: otherCustomerId,
    firstName: 'Nimal',
    lastName: 'Perera',
  },
};

describe('beneficiary service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.beneficiaryExists.mockResolvedValue(false);
    mocks.beneficiaryCreate.mockImplementation(async (value) => ({
      _id: '507f1f77bcf86cd799439099',
      ...value,
    }));
  });

  it('validates and saves an active external account', async () => {
    mocks.accountFindOne.mockReturnValue(queryResult(activeAccount));
    const result = await addBeneficiary(customerId, {
      accountNumber: activeAccount.accountNumber,
      nickname: 'Nimal',
    });
    expect(result).toMatchObject({
      accountName: 'Nimal Perera',
      nickname: 'Nimal',
      accountNumber: '609876543210',
    });
  });

  it('rejects inactive and self-owned beneficiary accounts', async () => {
    mocks.accountFindOne.mockReturnValueOnce(
      queryResult({ ...activeAccount, status: 'suspended' }),
    );
    await expect(
      addBeneficiary(customerId, {
        accountNumber: activeAccount.accountNumber,
        nickname: 'Inactive',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });

    mocks.accountFindOne.mockReturnValueOnce(
      queryResult({ ...activeAccount, owner: { ...activeAccount.owner, _id: customerId } }),
    );
    await expect(
      addBeneficiary(customerId, {
        accountNumber: activeAccount.accountNumber,
        nickname: 'Self',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejects duplicate beneficiaries', async () => {
    mocks.accountFindOne.mockReturnValue(queryResult(activeAccount));
    mocks.beneficiaryExists.mockResolvedValue(true);
    await expect(
      addBeneficiary(customerId, {
        accountNumber: activeAccount.accountNumber,
        nickname: 'Duplicate',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('does not remove a beneficiary outside the customer ownership scope', async () => {
    mocks.beneficiaryFindOneAndDelete.mockResolvedValue(null);
    await expect(removeBeneficiary(customerId, '507f1f77bcf86cd799439098')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mocks.beneficiaryFindOneAndDelete).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439098',
      owner: customerId,
    });
  });
});
