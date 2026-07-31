import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/AppError.js';

vi.mock('../services/transactionService.js', () => ({
  transferMoney: vi.fn(),
  listTransactions: vi.fn(),
  getTransactionForUser: vi.fn(),
  validateRecipient: vi.fn(),
}));

vi.mock('../services/auditService.js', () => ({
  createAuditLog: vi.fn(),
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

const { getTransactionForUser, transferMoney, validateRecipient } =
  await import('../services/transactionService.js');
const { default: app } = await import('../app.js');

describe('transaction API safeguards', () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    senderAccountId: '507f1f77bcf86cd799439012',
    receiverAccountNumber: '609876543210',
    amountMinor: 1000,
    description: 'Test',
  };

  it('requires an idempotency key', async () => {
    const response = await request(app)
      .post('/api/transactions/transfer')
      .send(validBody)
      .expect(400);
    expect(response.body.message).toMatch(/Idempotency-Key/);
    expect(transferMoney).not.toHaveBeenCalled();
  });

  it('accepts the Phase 4 transfer endpoint and body idempotency key', async () => {
    transferMoney.mockResolvedValue({
      duplicate: false,
      transaction: { _id: '507f1f77bcf86cd799439019', status: 'completed' },
    });
    await request(app)
      .post('/api/transfers')
      .send({ ...validBody, amount: validBody.amountMinor, idempotencyKey: 'body-key-001' })
      .expect(201);
  });

  it('validates a recipient without exposing private customer data', async () => {
    validateRecipient.mockResolvedValue({
      accountHolderName: 'A•••• S••••',
      accountNumber: '•••• •••• 3210',
      accountType: 'savings',
      canReceiveTransfers: true,
    });
    const response = await request(app)
      .post('/api/transfers/validate-recipient')
      .send({ accountNumber: '609876543210' })
      .expect(200);
    expect(response.body.data.recipient).not.toHaveProperty('email');
    expect(response.body.data.recipient).not.toHaveProperty('balance');
  });

  it('blocks non-customers from initiating transfers', async () => {
    await request(app)
      .post('/api/transfers')
      .set('x-test-role', 'employee')
      .send({ ...validBody, amount: validBody.amountMinor, idempotencyKey: 'body-key-002' })
      .expect(403);
  });

  it('allows a participant to view a receipt', async () => {
    getTransactionForUser.mockResolvedValue({
      _id: '507f1f77bcf86cd799439019',
      reference: 'TRF-TEST',
      amount: 1000,
      currency: 'LKR',
      senderAccount: '•••• 7890',
      receiverAccount: '•••• 3210',
      status: 'completed',
      initiatedAt: new Date(),
    });
    await request(app)
      .get('/api/transactions/507f1f77bcf86cd799439019/receipt')
      .expect(200);
  });

  it('returns forbidden when an unrelated customer requests a receipt', async () => {
    getTransactionForUser.mockRejectedValue(
      new AppError('You do not have permission to view this transaction', 403),
    );
    await request(app)
      .get('/api/transactions/507f1f77bcf86cd799439019/receipt')
      .expect(403);
  });

  it('rejects zero and negative transfer values', async () => {
    await request(app)
      .post('/api/transactions/transfer')
      .set('Idempotency-Key', 'validation-key-1')
      .send({ ...validBody, amountMinor: 0 })
      .expect(422);
    await request(app)
      .post('/api/transactions/transfer')
      .set('Idempotency-Key', 'validation-key-2')
      .send({ ...validBody, amountMinor: -100 })
      .expect(422);
    expect(transferMoney).not.toHaveBeenCalled();
  });

  it('rejects malformed account identifiers', async () => {
    await request(app)
      .post('/api/transactions/transfer')
      .set('Idempotency-Key', 'validation-key-3')
      .send({ ...validBody, senderAccountId: 'not-an-id' })
      .expect(422);
  });
});
