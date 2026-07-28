import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/transactionService.js', () => ({
  transferMoney: vi.fn(),
  listTransactions: vi.fn(),
  getTransactionForUser: vi.fn(),
}));

vi.mock('../middleware/authenticate.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'customer' };
    next();
  },
}));

const { transferMoney } = await import('../services/transactionService.js');
const { default: app } = await import('../app.js');

describe('transaction API safeguards', () => {
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
