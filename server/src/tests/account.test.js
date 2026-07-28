import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/Account.js', () => ({
  default: { exists: vi.fn().mockResolvedValue(false) },
}));

vi.mock('../services/accountService.js', () => ({
  applyForAccount: vi.fn(),
  listCustomerAccounts: vi.fn(),
  getAuthorizedAccount: vi.fn(),
  listPendingAccounts: vi.fn(),
  reviewAccount: vi.fn(),
  changeAccountStatus: vi.fn(),
}));

vi.mock('../middleware/authenticate.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      _id: '507f1f77bcf86cd799439011',
      role: req.get('x-test-role') || 'customer',
    };
    next();
  },
}));

const accountService = await import('../services/accountService.js');
const { generateUniqueAccountNumber } = await import('../utils/accountNumber.js');
const { default: app } = await import('../app.js');

describe('account API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates account applications', async () => {
    const response = await request(app)
      .post('/api/accounts')
      .send({ accountType: 'investment' })
      .expect(422);
    expect(response.body.success).toBe(false);
    expect(accountService.applyForAccount).not.toHaveBeenCalled();
  });

  it('submits a customer account application', async () => {
    accountService.applyForAccount.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      accountType: 'savings',
      status: 'pending',
      availableBalanceMinor: 0,
    });
    const response = await request(app)
      .post('/api/accounts')
      .send({ accountType: 'savings', applicationNote: 'Primary savings' })
      .expect(201);
    expect(response.body.data.account.status).toBe('pending');
  });

  it('prevents customers from viewing the staff review queue', async () => {
    await request(app).get('/api/accounts/pending').expect(403);
  });

  it('allows employees to view the pending queue', async () => {
    accountService.listPendingAccounts.mockResolvedValue([]);
    const response = await request(app)
      .get('/api/accounts/pending')
      .set('x-test-role', 'employee')
      .expect(200);
    expect(response.body.data.accounts).toEqual([]);
  });
});

describe('account number generation', () => {
  it('creates a 12-digit bank-generated number', async () => {
    const accountNumber = await generateUniqueAccountNumber();
    expect(accountNumber).toMatch(/^60\d{10}$/);
  });
});
