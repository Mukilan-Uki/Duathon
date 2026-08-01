import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  listDevices: vi.fn(),
  currentDevice: vi.fn(),
  trustDevice: vi.fn(),
  renameDevice: vi.fn(),
  revokeTrust: vi.fn(),
  logoutDevice: vi.fn(),
  logoutAllDevices: vi.fn(),
  observeLoginDevice: vi.fn(),
  recordDeviceLogin: vi.fn(),
  deviceTokenHash: vi.fn(),
}));
vi.mock('../services/trustedDeviceService.js', () => mocks);
vi.mock('../middleware/authenticate.js', () => ({
  authenticate(req, _res, next) {
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'customer' };
    next();
  },
}));
const { default: app } = await import('../app.js');
const deviceId = '507f1f77bcf86cd799439020';
describe('Trusted Device API', () => {
  beforeEach(() => vi.clearAllMocks());
  it('returns only safe device responses from the service', async () => {
    mocks.listDevices.mockResolvedValue([{ _id: deviceId, deviceName: 'Laptop', current: true }]);
    const response = await request(app).get('/api/security/devices').expect(200);
    expect(response.body.data.devices[0]).not.toHaveProperty('deviceIdHash');
  });
  it('requires password confirmation when trusting the current device', async () => {
    await request(app)
      .post('/api/security/devices/trust')
      .set('Origin', 'http://localhost:5173')
      .send({ deviceName: 'Laptop' })
      .expect(422);
    mocks.trustDevice.mockResolvedValue({
      device: { _id: deviceId },
      rawToken: 'raw-cookie-token',
    });
    await request(app)
      .post('/api/security/devices/trust')
      .set('Origin', 'http://localhost:5173')
      .send({ password: 'confirmed-password', deviceName: 'Laptop' })
      .expect(200);
    expect(mocks.trustDevice).toHaveBeenCalledOnce();
  });
  it('revokes a selected device session through its ownership boundary', async () => {
    mocks.currentDevice.mockResolvedValue(null);
    mocks.revokeTrust.mockResolvedValue({ _id: deviceId });
    await request(app)
      .delete(`/api/security/devices/${deviceId}/trust`)
      .set('Origin', 'http://localhost:5173')
      .send({ password: 'confirmed-password' })
      .expect(200);
    expect(mocks.revokeTrust).toHaveBeenCalledOnce();
  });
  it('supports logout-all while preserving the current device', async () => {
    mocks.currentDevice.mockResolvedValue({ _id: deviceId });
    mocks.logoutAllDevices.mockResolvedValue(2);
    const response = await request(app)
      .post('/api/security/devices/logout-all')
      .set('Origin', 'http://localhost:5173')
      .send({ password: 'confirmed-password', preserveCurrent: true })
      .expect(200);
    expect(response.body.data.revokedSessions).toBe(2);
  });
});
