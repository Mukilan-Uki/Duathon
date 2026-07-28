import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/loanService.js', () => ({
  submitLoanApplication: vi.fn(),
  listCustomerLoanApplications: vi.fn(),
  listReviewableLoanApplications: vi.fn(),
  reviewLoanApplication: vi.fn(),
  listCustomerLoans: vi.fn(),
  listLoanPayments: vi.fn(),
  payLoan: vi.fn(),
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

const loanService = await import('../services/loanService.js');
const { default: app } = await import('../app.js');

describe('loan API safeguards', () => {
  it('validates loan application amount, purpose, and term', async () => {
    await request(app)
      .post('/api/loans/applications')
      .send({
        disbursementAccountId: 'invalid',
        loanType: 'unknown',
        requestedAmountMinor: 0,
        purpose: 'short',
        repaymentMonths: 1,
      })
      .expect(422);
    expect(loanService.submitLoanApplication).not.toHaveBeenCalled();
  });

  it('prevents customers from opening the staff review queue', async () => {
    await request(app).get('/api/loans/applications').expect(403);
  });

  it('requires idempotency for loan payments', async () => {
    await request(app)
      .post('/api/loans/507f1f77bcf86cd799439020/payments')
      .send({
        sourceAccountId: '507f1f77bcf86cd799439012',
        amountMinor: 1000,
      })
      .expect(400);
    expect(loanService.payLoan).not.toHaveBeenCalled();
  });

  it('allows staff to request previous decisions', async () => {
    loanService.listReviewableLoanApplications.mockResolvedValue([]);
    const response = await request(app)
      .get('/api/loans/applications?status=approved')
      .set('x-test-role', 'employee')
      .expect(200);
    expect(response.body.data.applications).toEqual([]);
  });
});
