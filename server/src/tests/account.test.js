import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/AppError.js';

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
  approveAccount: vi.fn(),
  rejectAccount: vi.fn(),
  searchAccounts: vi.fn(),
}));

vi.mock('../middleware/authenticate.js', () => ({
  authenticate: (req, _res, next) => {
    if (req.get('x-test-auth') === 'none') {
      return next(new AppError('Authentication required', 401));
    }
    req.user = {
      _id: '507f1f77bcf86cd799439011',
      role: req.get('x-test-role') || 'customer',
    };
    return next();
  },
}));

const accountService = await import('../services/accountService.js');
const { generateUniqueAccountNumber } = await import('../utils/accountNumber.js');
const { default: app } = await import('../app.js');

describe('account API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates account applications', async () => {
    const response = await request(app)
      .post('/api/accounts/apply')
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
      .post('/api/accounts/apply')
      .send({ accountType: 'savings', branchCode: 'CMB01' })
      .expect(201);
    expect(response.body.data.account.status).toBe('pending');
  });

  it('blocks unauthenticated account applications', async () => {
    await request(app)
      .post('/api/accounts/apply')
      .set('x-test-auth', 'none')
      .send({ accountType: 'savings', branchCode: 'CMB01' })
      .expect(401);
  });

  it('rejects duplicate pending applications', async () => {
    accountService.applyForAccount.mockRejectedValue(
      new AppError('A pending application already exists for this account type', 409),
    );
    await request(app)
      .post('/api/accounts/apply')
      .send({ accountType: 'savings', branchCode: 'CMB01' })
      .expect(409);
  });

  it('allows a customer to view their own account', async () => {
    accountService.getAuthorizedAccount.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      maskedAccountNumber: '•••• •••• 7890',
    });
    const response = await request(app).get('/api/accounts/507f1f77bcf86cd799439012').expect(200);
    expect(response.body.data.account.maskedAccountNumber).toContain('7890');
  });

  it('blocks a customer from viewing another customer account', async () => {
    accountService.getAuthorizedAccount.mockRejectedValue(new AppError('Account not found', 404));
    await request(app).get('/api/accounts/507f1f77bcf86cd799439013').expect(404);
  });

  it('prevents customers from viewing the staff review queue', async () => {
    await request(app).get('/api/accounts/pending').expect(403);
  });

  it('approves a pending account as an employee', async () => {
    accountService.approveAccount.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      status: 'active',
      accountNumber: '601234567890',
    });
    const response = await request(app)
      .patch('/api/accounts/507f1f77bcf86cd799439012/approve')
      .set('x-test-role', 'employee')
      .expect(200);
    expect(response.body.data.account.status).toBe('active');
  });

  it('rejects a duplicate approval attempt', async () => {
    accountService.approveAccount.mockRejectedValue(
      new AppError('Only pending accounts can be approved', 409),
    );
    await request(app)
      .patch('/api/accounts/507f1f77bcf86cd799439012/approve')
      .set('x-test-role', 'employee')
      .expect(409);
  });

  it('suspends an account with a reason', async () => {
    accountService.changeAccountStatus.mockResolvedValue({ status: 'suspended' });
    const response = await request(app)
      .patch('/api/accounts/507f1f77bcf86cd799439012/suspend')
      .set('x-test-role', 'employee')
      .send({ reason: 'Identity review required' })
      .expect(200);
    expect(response.body.data.account.status).toBe('suspended');
  });

  it('blocks customers from administrative account actions', async () => {
    await request(app)
      .patch('/api/accounts/507f1f77bcf86cd799439012/suspend')
      .send({ reason: 'Not permitted' })
      .expect(403);
    expect(accountService.changeAccountStatus).not.toHaveBeenCalled();
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
  beforeEach(() => vi.clearAllMocks());

  it('creates a 12-digit bank-generated number', async () => {
    const accountNumber = await generateUniqueAccountNumber();
    expect(accountNumber).toMatch(/^60\d{10}$/);
  });

  it('retries when an account number collides', async () => {
    const Account = (await import('../models/Account.js')).default;
    Account.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const accountNumber = await generateUniqueAccountNumber();
    expect(accountNumber).toMatch(/^60\d{10}$/);
    expect(Account.exists).toHaveBeenCalledTimes(2);
  });
});
