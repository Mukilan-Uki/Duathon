import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/dashboardService.js', () => ({
  getCustomerDashboard: vi.fn(),
  getEmployeeDashboard: vi.fn(),
  getAdminDashboard: vi.fn(),
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

const dashboardService = await import('../services/dashboardService.js');
const { default: app } = await import('../app.js');

describe('dashboard API authorization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the customer dashboard only to customers', async () => {
    dashboardService.getCustomerDashboard.mockResolvedValue({
      summary: { totalAccounts: 2 },
    });
    const response = await request(app).get('/api/dashboards/customer').expect(200);

    expect(response.body.data.summary.totalAccounts).toBe(2);
    expect(dashboardService.getCustomerDashboard).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    await request(app).get('/api/dashboards/customer').set('x-test-role', 'employee').expect(403);
  });

  it('restricts the employee dashboard to employees', async () => {
    dashboardService.getEmployeeDashboard.mockResolvedValue({
      summary: { pendingAccounts: 3 },
    });
    const response = await request(app)
      .get('/api/dashboards/employee')
      .set('x-test-role', 'employee')
      .expect(200);

    expect(response.body.data.summary.pendingAccounts).toBe(3);
    await request(app).get('/api/dashboards/employee').set('x-test-role', 'admin').expect(403);
  });

  it('restricts the bank-wide dashboard to administrators', async () => {
    dashboardService.getAdminDashboard.mockResolvedValue({
      summary: { totalUsers: 12 },
    });
    const response = await request(app)
      .get('/api/dashboards/admin')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(response.body.data.summary.totalUsers).toBe(12);
    await request(app).get('/api/dashboards/admin').set('x-test-role', 'employee').expect(403);
  });
});
