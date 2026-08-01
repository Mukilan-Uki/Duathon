import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accountFindOne: vi.fn(),
  accountFindById: vi.fn(),
  beneficiaryExists: vi.fn(),
  beneficiaryCreate: vi.fn(),
  beneficiaryFindOne: vi.fn(),
  beneficiaryFind: vi.fn(),
  beneficiaryCountDocuments: vi.fn(),
  connectionTransaction: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock('mongoose', () => ({
  default: {
    connection: { transaction: mocks.connectionTransaction },
  },
}));

vi.mock('../models/Account.js', () => ({
  default: {
    findOne: mocks.accountFindOne,
    findById: mocks.accountFindById,
  },
}));

vi.mock('../models/Beneficiary.js', () => ({
  default: {
    exists: mocks.beneficiaryExists,
    create: mocks.beneficiaryCreate,
    findOne: mocks.beneficiaryFindOne,
    find: mocks.beneficiaryFind,
    countDocuments: mocks.beneficiaryCountDocuments,
  },
}));

vi.mock('../services/auditService.js', () => ({
  createAuditLog: mocks.createAuditLog,
}));

const {
  addBeneficiary,
  getBeneficiary,
  listBeneficiaries,
  removeBeneficiary,
  restoreBeneficiary,
  updateBeneficiary,
  verifyBeneficiaryAccount,
} = await import('../services/beneficiaryService.js');

function queryResult(value) {
  return {
    select: vi.fn(function select() {
      return this;
    }),
    populate: vi.fn(function populate() {
      return this;
    }),
    sort: vi.fn(function sort() {
      return this;
    }),
    skip: vi.fn(function skip() {
      return this;
    }),
    limit: vi.fn(function limit() {
      return this;
    }),
    session: vi.fn(function session() {
      return this;
    }),
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

const customerId = '507f1f77bcf86cd799439011';
const otherCustomerId = '507f1f77bcf86cd799439014';
const beneficiaryId = '507f1f77bcf86cd799439099';
const accountId = '507f1f77bcf86cd799439012';
const metadata = { ip: '127.0.0.1', userAgent: 'vitest' };

function makeAccount(overrides = {}) {
  return {
    _id: accountId,
    accountNumber: '609876543210',
    accountType: 'savings',
    status: 'active',
    owner: {
      _id: otherCustomerId,
      firstName: 'Nimal',
      lastName: 'Perera',
    },
    ...overrides,
  };
}

function makeBeneficiary(overrides = {}) {
  const beneficiary = {
    _id: beneficiaryId,
    owner: customerId,
    beneficiaryAccount: accountId,
    beneficiaryAccountNumber: '609876543210',
    nickname: 'Nimal',
    relationship: 'friend',
    status: 'active',
    isFavourite: true,
    lastUsedAt: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  beneficiary.toObject = () => {
    const value = { ...beneficiary };
    delete value.save;
    delete value.toObject;
    return value;
  };
  return beneficiary;
}

describe('beneficiary service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectionTransaction.mockReset();
    mocks.connectionTransaction.mockImplementation(async (work) =>
      work({ id: 'beneficiary-session' }),
    );
    mocks.beneficiaryExists.mockReset();
    mocks.beneficiaryExists.mockImplementation(() => queryResult(false));
    mocks.beneficiaryCountDocuments.mockResolvedValue(0);
    mocks.createAuditLog.mockResolvedValue({ _id: 'audit-id' });
    mocks.beneficiaryCreate.mockImplementation(async (records) =>
      records.map((value) => makeBeneficiary(value)),
    );
  });

  it('creates an active external beneficiary, audits it, and returns only masked data', async () => {
    const account = makeAccount();
    mocks.accountFindOne.mockReturnValue(queryResult(account));

    const result = await addBeneficiary(
      customerId,
      {
        accountNumber: account.accountNumber,
        nickname: 'Nimal',
        relationship: 'friend',
      },
      metadata,
    );

    expect(mocks.beneficiaryCreate).toHaveBeenCalledWith(
      [
        {
          owner: customerId,
          beneficiaryAccount: accountId,
          beneficiaryAccountNumber: account.accountNumber,
          nickname: 'Nimal',
          relationship: 'friend',
          status: 'active',
        },
      ],
      { session: { id: 'beneficiary-session' } },
    );
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: customerId,
        action: 'BENEFICIARY_CREATED',
        targetType: 'Beneficiary',
        targetId: beneficiaryId,
        metadata,
        session: { id: 'beneficiary-session' },
      }),
    );
    expect(mocks.createAuditLog.mock.calls[0][0].after).not.toHaveProperty('accountNumber');
    expect(result).toMatchObject({
      _id: beneficiaryId,
      nickname: 'Nimal',
      relationship: 'friend',
      accountNumber: '•••• •••• 3210',
      accountHolderName: 'N•••• P••••',
      accountType: 'savings',
      available: true,
    });
    expect(result.accountNumber).not.toBe(account.accountNumber);
    expect(result).not.toHaveProperty('owner');
    expect(result).not.toHaveProperty('beneficiaryAccount');
    expect(result).not.toHaveProperty('balance');
  });

  it('rejects a receiver account that does not exist', async () => {
    mocks.accountFindOne.mockReturnValue(queryResult(null));

    await expect(
      addBeneficiary(customerId, {
        accountNumber: '609876543210',
        nickname: 'Missing',
        relationship: 'other',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.beneficiaryCreate).not.toHaveBeenCalled();
  });

  it('rejects a suspended receiver account', async () => {
    mocks.accountFindOne.mockReturnValue(queryResult(makeAccount({ status: 'suspended' })));

    await expect(
      addBeneficiary(customerId, {
        accountNumber: '609876543210',
        nickname: 'Suspended',
        relationship: 'business',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.beneficiaryCreate).not.toHaveBeenCalled();
  });

  it('rejects one of the customer own accounts', async () => {
    mocks.accountFindOne.mockReturnValue(
      queryResult(
        makeAccount({
          owner: { _id: customerId, firstName: 'Own', lastName: 'Account' },
        }),
      ),
    );

    await expect(
      addBeneficiary(customerId, {
        accountNumber: '609876543210',
        nickname: 'Mine',
        relationship: 'other',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(mocks.beneficiaryExists).not.toHaveBeenCalled();
  });

  it('rejects a duplicate beneficiary within the owner scope', async () => {
    mocks.accountFindOne.mockReturnValue(queryResult(makeAccount()));
    mocks.beneficiaryExists.mockImplementation(() => queryResult(true));

    await expect(
      addBeneficiary(customerId, {
        accountNumber: '609876543210',
        nickname: 'Duplicate',
        relationship: 'friend',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.beneficiaryExists).toHaveBeenCalledWith({
      owner: customerId,
      beneficiaryAccount: accountId,
    });
    expect(mocks.beneficiaryCreate).not.toHaveBeenCalled();
  });

  it('verifies an account with masked holder data and no private profile fields', async () => {
    mocks.accountFindOne.mockReturnValue(queryResult(makeAccount()));

    const result = await verifyBeneficiaryAccount('609876543210');

    expect(result).toEqual({
      accountNumber: '•••• •••• 3210',
      accountHolderName: 'N•••• P••••',
      accountType: 'savings',
      canReceiveTransfers: true,
    });
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('phoneNumber');
    expect(result).not.toHaveProperty('balance');
  });

  it('marks a suspended verified account as unable to receive transfers', async () => {
    mocks.accountFindOne.mockReturnValue(queryResult(makeAccount({ status: 'suspended' })));

    await expect(verifyBeneficiaryAccount('000000000000')).resolves.toMatchObject({
      canReceiveTransfers: false,
    });
  });

  it('lists only the owner records with escaped search, filters, sorting, and pagination', async () => {
    const record = makeBeneficiary({ beneficiaryAccount: makeAccount() });
    const listQuery = queryResult([record]);
    mocks.beneficiaryFind.mockReturnValue(listQuery);
    mocks.beneficiaryCountDocuments.mockResolvedValue(21);

    const result = await listBeneficiaries(customerId, {
      search: 'Ni.*',
      status: 'active',
      favourite: true,
      sort: 'lastUsed',
      page: 2,
      limit: 10,
    });

    const scopedQuery = mocks.beneficiaryFind.mock.calls[0][0];
    expect(scopedQuery).toMatchObject({
      owner: customerId,
      isFavourite: true,
      $and: [{ $or: [{ status: 'active' }, { status: { $exists: false } }] }],
    });
    expect(scopedQuery.nickname).toBeInstanceOf(RegExp);
    expect(scopedQuery.nickname.source).toBe('Ni\\.\\*');
    expect(listQuery.sort).toHaveBeenCalledWith({ lastUsedAt: -1, createdAt: -1 });
    expect(listQuery.skip).toHaveBeenCalledWith(10);
    expect(listQuery.limit).toHaveBeenCalledWith(10);
    expect(result.pagination).toEqual({ page: 2, limit: 10, total: 21, pages: 3 });
    expect(result.beneficiaries[0].accountNumber).toBe('•••• •••• 3210');
  });

  it('includes legacy lifecycle records in active and non-favourite filters', async () => {
    mocks.beneficiaryFind.mockReturnValue(queryResult([]));

    await listBeneficiaries(customerId, {
      search: '',
      status: 'active',
      favourite: false,
      sort: 'nickname',
      page: 1,
      limit: 20,
    });

    expect(mocks.beneficiaryFind).toHaveBeenCalledWith({
      owner: customerId,
      $and: [
        { $or: [{ status: 'active' }, { status: { $exists: false } }] },
        { $or: [{ isFavourite: false }, { isFavourite: { $exists: false } }] },
      ],
    });
  });

  it('scopes beneficiary details to the authenticated owner', async () => {
    mocks.beneficiaryFindOne.mockReturnValue(queryResult(null));

    await expect(getBeneficiary(customerId, beneficiaryId)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mocks.beneficiaryFindOne).toHaveBeenCalledWith({
      _id: beneficiaryId,
      owner: customerId,
    });
  });

  it('updates only editable beneficiary fields and records a safe audit event', async () => {
    const editable = makeBeneficiary({
      nickname: 'Old',
      relationship: 'other',
      isFavourite: false,
    });
    const populated = makeBeneficiary({ beneficiaryAccount: makeAccount() });
    mocks.beneficiaryFindOne
      .mockReturnValueOnce(queryResult(editable))
      .mockReturnValueOnce(queryResult(populated));
    const changes = { nickname: 'Supplier', relationship: 'business', isFavourite: true };

    const result = await updateBeneficiary(customerId, beneficiaryId, changes, metadata);

    expect(editable).toMatchObject(changes);
    expect(editable.save).toHaveBeenCalledOnce();
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: customerId,
        action: 'BENEFICIARY_UPDATED',
        before: { nickname: 'Old', relationship: 'other', isFavourite: false },
        after: changes,
        metadata,
      }),
    );
    expect(result._id).toBe(beneficiaryId);
  });

  it('does not update a beneficiary outside the customer ownership scope', async () => {
    mocks.beneficiaryFindOne.mockReturnValue(queryResult(null));

    await expect(
      updateBeneficiary(customerId, beneficiaryId, { nickname: 'No access' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.beneficiaryFindOne).toHaveBeenCalledWith({
      _id: beneficiaryId,
      owner: customerId,
    });
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it('does not let a customer update a blocked beneficiary', async () => {
    const beneficiary = makeBeneficiary({ status: 'blocked' });
    mocks.beneficiaryFindOne.mockReturnValue(queryResult(beneficiary));

    await expect(
      updateBeneficiary(customerId, beneficiaryId, { nickname: 'No access' }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(beneficiary.save).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it('soft removes an owned beneficiary and clears its favourite flag', async () => {
    const beneficiary = makeBeneficiary();
    mocks.beneficiaryFindOne.mockReturnValue(queryResult(beneficiary));

    await removeBeneficiary(customerId, beneficiaryId, metadata);

    expect(beneficiary.status).toBe('inactive');
    expect(beneficiary.isFavourite).toBe(false);
    expect(beneficiary.save).toHaveBeenCalledOnce();
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BENEFICIARY_DEACTIVATED',
        before: { status: 'active' },
        after: { status: 'inactive' },
      }),
    );
  });

  it('does not let a customer downgrade and later restore a blocked beneficiary', async () => {
    const beneficiary = makeBeneficiary({ status: 'blocked' });
    mocks.beneficiaryFindOne.mockReturnValue(queryResult(beneficiary));

    await expect(removeBeneficiary(customerId, beneficiaryId)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(beneficiary.status).toBe('blocked');
    expect(beneficiary.save).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it('restores an inactive beneficiary only while the linked account remains active', async () => {
    const beneficiary = makeBeneficiary({ status: 'inactive', isFavourite: false });
    mocks.beneficiaryFindOne.mockReturnValue(queryResult(beneficiary));
    mocks.accountFindById.mockReturnValue(queryResult(makeAccount()));

    const result = await restoreBeneficiary(customerId, beneficiaryId, metadata);

    expect(beneficiary.status).toBe('active');
    expect(beneficiary.save).toHaveBeenCalledOnce();
    expect(mocks.beneficiaryExists).toHaveBeenCalledWith({
      _id: { $ne: beneficiaryId },
      owner: customerId,
      beneficiaryAccount: accountId,
      status: 'active',
    });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BENEFICIARY_RESTORED',
        before: { status: 'inactive' },
        after: { status: 'active' },
      }),
    );
    expect(result.available).toBe(true);
  });

  it.each([
    ['missing', null],
    ['suspended', makeAccount({ status: 'suspended' })],
  ])('rejects restoration when the linked account is %s', async (_label, account) => {
    const beneficiary = makeBeneficiary({ status: 'inactive' });
    mocks.beneficiaryFindOne.mockReturnValue(queryResult(beneficiary));
    mocks.accountFindById.mockReturnValue(queryResult(account));

    await expect(restoreBeneficiary(customerId, beneficiaryId)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(beneficiary.save).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it('rejects restoration when another active record already targets the account', async () => {
    const beneficiary = makeBeneficiary({ status: 'inactive' });
    mocks.beneficiaryFindOne.mockReturnValue(queryResult(beneficiary));
    mocks.accountFindById.mockReturnValue(queryResult(makeAccount()));
    mocks.beneficiaryExists.mockImplementation(() => queryResult(true));

    await expect(restoreBeneficiary(customerId, beneficiaryId)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(beneficiary.save).not.toHaveBeenCalled();
  });

  it('rejects restoration of a blocked beneficiary without reading the linked account', async () => {
    const beneficiary = makeBeneficiary({ status: 'blocked' });
    mocks.beneficiaryFindOne.mockReturnValue(queryResult(beneficiary));

    await expect(restoreBeneficiary(customerId, beneficiaryId)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mocks.accountFindById).not.toHaveBeenCalled();
    expect(beneficiary.save).not.toHaveBeenCalled();
  });
});
