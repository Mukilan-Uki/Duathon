import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/AppError.js';

vi.mock('../services/beneficiaryService.js', () => ({
  addBeneficiary: vi.fn(),
  verifyBeneficiaryAccount: vi.fn(),
  listBeneficiaries: vi.fn(),
  getBeneficiary: vi.fn(),
  updateBeneficiary: vi.fn(),
  removeBeneficiary: vi.fn(),
  restoreBeneficiary: vi.fn(),
}));

vi.mock('../middleware/authenticate.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      _id: req.get('x-test-user') || '507f1f77bcf86cd799439011',
      role: req.get('x-test-role') || 'customer',
    };
    next();
  },
}));

const beneficiaryService = await import('../services/beneficiaryService.js');
const { default: app } = await import('../app.js');

const customerId = '507f1f77bcf86cd799439011';
const beneficiaryId = '507f1f77bcf86cd799439099';
const safeBeneficiary = {
  _id: beneficiaryId,
  nickname: 'Nimal',
  relationship: 'friend',
  status: 'active',
  isFavourite: false,
  accountNumber: '•••• •••• 3210',
  accountHolderName: 'N•••• P••••',
  accountType: 'savings',
  available: true,
};

describe('beneficiary API safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    beneficiaryService.addBeneficiary.mockResolvedValue(safeBeneficiary);
    beneficiaryService.verifyBeneficiaryAccount.mockResolvedValue({
      accountNumber: '•••• •••• 3210',
      accountHolderName: 'N•••• P••••',
      accountType: 'savings',
      canReceiveTransfers: true,
    });
    beneficiaryService.listBeneficiaries.mockResolvedValue({
      beneficiaries: [safeBeneficiary],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    beneficiaryService.getBeneficiary.mockResolvedValue(safeBeneficiary);
    beneficiaryService.updateBeneficiary.mockResolvedValue({
      ...safeBeneficiary,
      nickname: 'Updated',
      isFavourite: true,
    });
    beneficiaryService.removeBeneficiary.mockResolvedValue(undefined);
    beneficiaryService.restoreBeneficiary.mockResolvedValue(safeBeneficiary);
  });

  it('validates account number, nickname, and relationship before creation', async () => {
    const response = await request(app)
      .post('/api/beneficiaries')
      .send({ accountNumber: '123', nickname: 'A', relationship: 'unsafe-value' })
      .expect(422);

    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(beneficiaryService.addBeneficiary).not.toHaveBeenCalled();
  });

  it('rejects owner and account-state mass assignment fields', async () => {
    await request(app)
      .post('/api/beneficiaries')
      .send({
        accountNumber: '609876543210',
        nickname: 'Nimal',
        relationship: 'friend',
        owner: '507f1f77bcf86cd799439014',
        status: 'active',
        balance: 1000000,
      })
      .expect(422);

    expect(beneficiaryService.addBeneficiary).not.toHaveBeenCalled();
  });

  it('creates a beneficiary using the authenticated customer identity', async () => {
    const response = await request(app)
      .post('/api/beneficiaries')
      .set('user-agent', 'vitest')
      .send({
        accountNumber: '609876543210',
        nickname: 'Nimal',
        relationship: 'friend',
      })
      .expect(201);

    expect(beneficiaryService.addBeneficiary).toHaveBeenCalledWith(
      customerId,
      {
        accountNumber: '609876543210',
        nickname: 'Nimal',
        relationship: 'friend',
      },
      expect.objectContaining({ ip: expect.any(String), userAgent: 'vitest' }),
    );
    expect(response.body.data.beneficiary).toEqual(safeBeneficiary);
  });

  it('rejects non-customer roles on beneficiary routes', async () => {
    await request(app).get('/api/beneficiaries').set('x-test-role', 'employee').expect(403);

    expect(beneficiaryService.listBeneficiaries).not.toHaveBeenCalled();
  });

  it('verifies a receiver account with only safe masked fields', async () => {
    const response = await request(app)
      .post('/api/beneficiaries/verify-account')
      .set('x-forwarded-for', '198.51.100.10')
      .send({ accountNumber: '609876543210' })
      .expect(200);

    expect(beneficiaryService.verifyBeneficiaryAccount).toHaveBeenCalledWith('609876543210');
    expect(response.body.data.verification).toEqual({
      accountNumber: '•••• •••• 3210',
      accountHolderName: 'N•••• P••••',
      accountType: 'savings',
      canReceiveTransfers: true,
    });
    expect(response.body.data.verification).not.toHaveProperty('email');
    expect(response.body.data.verification).not.toHaveProperty('phoneNumber');
    expect(response.body.data.verification).not.toHaveProperty('balance');
  });

  it('validates account verification input before calling the service', async () => {
    await request(app)
      .post('/api/beneficiaries/verify-account')
      .set('x-forwarded-for', '198.51.100.11')
      .send({ accountNumber: 'not-an-account' })
      .expect(422);

    expect(beneficiaryService.verifyBeneficiaryAccount).not.toHaveBeenCalled();
  });

  it('rate limits repeated account verification attempts', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 16 }, () =>
        request(app)
          .post('/api/beneficiaries/verify-account')
          .set('x-forwarded-for', '203.0.113.77')
          .send({ accountNumber: '609876543210' }),
      ),
    );

    expect(attempts.filter((response) => response.status === 200)).toHaveLength(15);
    expect(attempts.filter((response) => response.status === 429)).toHaveLength(1);
    expect(attempts.find((response) => response.status === 429).body.message).toMatch(
      /Too many beneficiary account requests/i,
    );
    expect(beneficiaryService.verifyBeneficiaryAccount).toHaveBeenCalledTimes(15);
  });

  it('applies the account-enumeration limiter to direct creation attempts too', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 16 }, () =>
        request(app).post('/api/beneficiaries').set('x-forwarded-for', '203.0.113.88').send({
          accountNumber: '609876543210',
          nickname: 'Nimal',
          relationship: 'friend',
        }),
      ),
    );

    expect(attempts.filter((response) => response.status === 201)).toHaveLength(15);
    expect(attempts.filter((response) => response.status === 429)).toHaveLength(1);
    expect(beneficiaryService.addBeneficiary).toHaveBeenCalledTimes(15);
  });

  it('passes validated search, filters, sort, and pagination to the scoped list service', async () => {
    const response = await request(app)
      .get('/api/beneficiaries')
      .query({
        search: 'Nimal',
        status: 'active',
        favourite: 'true',
        sort: 'lastUsed',
        page: '2',
        limit: '10',
      })
      .expect(200);

    expect(beneficiaryService.listBeneficiaries).toHaveBeenCalledWith(customerId, {
      search: 'Nimal',
      status: 'active',
      favourite: true,
      sort: 'lastUsed',
      page: 2,
      limit: 10,
    });
    expect(response.body.data).toHaveProperty('beneficiaries');
    expect(response.body.data).toHaveProperty('pagination');
  });

  it('loads details through the authenticated owner scope', async () => {
    await request(app).get(`/api/beneficiaries/${beneficiaryId}`).expect(200);

    expect(beneficiaryService.getBeneficiary).toHaveBeenCalledWith(customerId, beneficiaryId);
  });

  it('does not reveal another customer beneficiary', async () => {
    beneficiaryService.getBeneficiary.mockRejectedValue(new AppError('Beneficiary not found', 404));

    await request(app).get(`/api/beneficiaries/${beneficiaryId}`).expect(404);
    expect(beneficiaryService.getBeneficiary).toHaveBeenCalledWith(customerId, beneficiaryId);
  });

  it('rejects malformed beneficiary identifiers', async () => {
    await request(app).get('/api/beneficiaries/not-an-id').expect(422);
    expect(beneficiaryService.getBeneficiary).not.toHaveBeenCalled();
  });

  it('updates only the allowed editable fields', async () => {
    const changes = { nickname: 'Updated', relationship: 'business', isFavourite: true };
    const response = await request(app)
      .patch(`/api/beneficiaries/${beneficiaryId}`)
      .send(changes)
      .expect(200);

    expect(beneficiaryService.updateBeneficiary).toHaveBeenCalledWith(
      customerId,
      beneficiaryId,
      changes,
      expect.objectContaining({ ip: expect.any(String), userAgent: expect.any(String) }),
    );
    expect(response.body.data.beneficiary.nickname).toBe('Updated');
  });

  it.each([
    ['accountNumber', '600000000000'],
    ['beneficiaryAccount', '507f1f77bcf86cd799439012'],
    ['owner', '507f1f77bcf86cd799439014'],
    ['status', 'blocked'],
    ['balance', 10],
  ])('prevents patching %s', async (field, value) => {
    await request(app)
      .patch(`/api/beneficiaries/${beneficiaryId}`)
      .send({ nickname: 'Still safe', [field]: value })
      .expect(422);

    expect(beneficiaryService.updateBeneficiary).not.toHaveBeenCalled();
  });

  it('requires at least one editable field for an update', async () => {
    await request(app).patch(`/api/beneficiaries/${beneficiaryId}`).send({}).expect(422);
    expect(beneficiaryService.updateBeneficiary).not.toHaveBeenCalled();
  });

  it('soft removes through the authenticated owner scope', async () => {
    await request(app).delete(`/api/beneficiaries/${beneficiaryId}`).expect(200);

    expect(beneficiaryService.removeBeneficiary).toHaveBeenCalledWith(
      customerId,
      beneficiaryId,
      expect.objectContaining({ ip: expect.any(String), userAgent: expect.any(String) }),
    );
  });

  it('restores through the static restore route and owner scope', async () => {
    const response = await request(app)
      .patch(`/api/beneficiaries/${beneficiaryId}/restore`)
      .send({})
      .expect(200);

    expect(beneficiaryService.restoreBeneficiary).toHaveBeenCalledWith(
      customerId,
      beneficiaryId,
      expect.objectContaining({ ip: expect.any(String), userAgent: expect.any(String) }),
    );
    expect(response.body.data.beneficiary).toEqual(safeBeneficiary);
  });
});
