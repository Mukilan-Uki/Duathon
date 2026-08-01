import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/notificationService.js', () => ({
  createNotification: vi.fn(),
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  updateNotificationPreferences: vi.fn(),
  deleteNotification: vi.fn(),
  broadcastNotification: vi.fn(),
}));
vi.mock('../services/operationsService.js', () => ({
  listAuditLogs: vi.fn(),
  listSuspiciousActivities: vi.fn(),
  flagTransaction: vi.fn(),
  updateInvestigation: vi.fn(),
  listSystemSettings: vi.fn(),
  upsertSystemSetting: vi.fn(),
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

const notificationService = await import('../services/notificationService.js');
const operationsService = await import('../services/operationsService.js');
const { default: app } = await import('../app.js');

describe('Phase 8 operations API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists only the authenticated user notification feed', async () => {
    notificationService.listNotifications.mockResolvedValue({
      notifications: [],
      unread: 0,
      pagination: { page: 1, limit: 20, total: 0, pages: 1 },
    });
    const response = await request(app).get('/api/operations/notifications').expect(200);
    expect(response.body.data.unread).toBe(0);
    expect(notificationService.listNotifications).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({ page: 1 }),
    );
  });

  it('supports the canonical unread feed and owned soft deletion endpoints', async () => {
    notificationService.listNotifications.mockResolvedValue({
      notifications: [],
      unread: 2,
      pagination: { page: 1, limit: 20, total: 2, pages: 1 },
    });
    await request(app).get('/api/notifications/unread').expect(200);
    expect(notificationService.listNotifications).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({ unreadOnly: true }),
    );

    await request(app).delete('/api/notifications/507f1f77bcf86cd799439020').expect(200);
    expect(notificationService.deleteNotification).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439020',
    );
  });

  it('allows only administrators to broadcast announcements', async () => {
    const payload = { title: 'Maintenance', message: 'Services restart tonight.', audience: 'all' };
    await request(app).post('/api/admin/notifications/broadcast').send(payload).expect(403);
    notificationService.broadcastNotification.mockResolvedValue(12);
    const response = await request(app)
      .post('/api/admin/notifications/broadcast')
      .set('x-test-role', 'admin')
      .send(payload)
      .expect(201);
    expect(response.body.data.sent).toBe(12);
  });

  it('prevents customers from flagging transactions', async () => {
    await request(app)
      .post('/api/operations/transactions/507f1f77bcf86cd799439020/flag')
      .send({ reason: 'This transfer pattern requires investigation' })
      .expect(403);
    expect(operationsService.flagTransaction).not.toHaveBeenCalled();
  });

  it('allows employees to flag a valid transaction', async () => {
    operationsService.flagTransaction.mockResolvedValue({ _id: 'activity-id', status: 'open' });
    const response = await request(app)
      .post('/api/operations/transactions/507f1f77bcf86cd799439020/flag')
      .set('x-test-role', 'employee')
      .send({ reason: 'This transfer pattern requires investigation' })
      .expect(201);
    expect(response.body.data.activity.status).toBe('open');
  });

  it('limits audit logs and settings to administrators', async () => {
    await request(app).get('/api/operations/audit-logs').set('x-test-role', 'employee').expect(403);
    operationsService.listSystemSettings.mockResolvedValue([]);
    await request(app)
      .get('/api/operations/system-settings')
      .set('x-test-role', 'admin')
      .expect(200);
  });
});
