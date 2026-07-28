import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/beneficiaryService.js', () => ({
  addBeneficiary: vi.fn(),
  listBeneficiaries: vi.fn(),
  removeBeneficiary: vi.fn(),
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

const beneficiaryService = await import('../services/beneficiaryService.js');
const { default: app } = await import('../app.js');

describe('beneficiary API', () => {
  it('validates account number and nickname', async () => {
    const response = await request(app)
      .post('/api/beneficiaries')
      .send({ accountNumber: '123', nickname: 'A' })
      .expect(422);
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(beneficiaryService.addBeneficiary).not.toHaveBeenCalled();
  });

  it('rejects non-customer roles', async () => {
    await request(app).get('/api/beneficiaries').set('x-test-role', 'employee').expect(403);
  });

  it('returns a customer beneficiary list', async () => {
    beneficiaryService.listBeneficiaries.mockResolvedValue([]);
    const response = await request(app).get('/api/beneficiaries').expect(200);
    expect(response.body.data.beneficiaries).toEqual([]);
  });
});
