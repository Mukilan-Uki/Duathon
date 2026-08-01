import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  createJuniorProfile: vi.fn(),
  createJuniorAccount: vi.fn(),
  getControls: vi.fn(),
  updateControls: vi.fn(),
  createAllowance: vi.fn(),
  listAllowances: vi.fn(),
  changeAllowance: vi.fn(),
  requestTransaction: vi.fn(),
  myRequests: vi.fn(),
  pendingApprovals: vi.fn(),
  reviewRequest: vi.fn(),
  cancelRequest: vi.fn(),
}));
vi.mock('../services/juniorBankingService.js', () => mocks);
vi.mock('../middleware/authenticate.js', () => ({
  authenticate(req, _res, next) {
    req.user = { _id: '507f1f77bcf86cd799439011', role: req.get('x-test-role') || 'customer' };
    next();
  },
}));
const { default: app } = await import('../app.js');
const juniorId = '507f1f77bcf86cd799439020';
describe('Junior Banking API', () => {
  beforeEach(() => vi.clearAllMocks());
  it('creates a validated junior profile through the guardian service boundary', async () => {
    mocks.createJuniorProfile.mockResolvedValue({ _id: juniorId });
    await request(app)
      .post('/api/junior-banking/profiles')
      .send({
        familyId: '507f1f77bcf86cd799439021',
        juniorUserId: '507f1f77bcf86cd799439022',
        relationshipToGuardian: 'child',
      })
      .expect(201);
  });
  it('rejects staff access to guardian endpoints', async () => {
    await request(app)
      .get(`/api/junior-banking/${juniorId}/controls`)
      .set('x-test-role', 'employee')
      .expect(403);
  });
  it('requires idempotency for junior transaction requests', async () => {
    await request(app)
      .post('/api/junior-banking/transactions/request')
      .send({
        juniorAccountId: '507f1f77bcf86cd799439023',
        receiverAccountId: '507f1f77bcf86cd799439024',
        amountMinor: 1000,
      })
      .expect(400);
    mocks.requestTransaction.mockResolvedValue({ _id: 'request' });
    await request(app)
      .post('/api/junior-banking/transactions/request')
      .set('Idempotency-Key', 'junior-request-key-001')
      .send({
        juniorAccountId: '507f1f77bcf86cd799439023',
        receiverAccountId: '507f1f77bcf86cd799439024',
        amountMinor: 1000,
      })
      .expect(201);
    expect(mocks.requestTransaction).toHaveBeenCalledOnce();
  });
  it('delegates approval to the service that revalidates and transfers', async () => {
    mocks.reviewRequest.mockResolvedValue({ status: 'completed' });
    const response = await request(app)
      .patch('/api/junior-banking/approvals/507f1f77bcf86cd799439025/approve')
      .send({ reason: 'Approved' })
      .expect(200);
    expect(response.body.data.request.status).toBe('completed');
  });
});
