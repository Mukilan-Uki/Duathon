import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../api/httpClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const { default: httpClient } = await import('../api/httpClient');
const { securityService } = await import('./securityService');
describe('securityService', () => {
  beforeEach(() => vi.clearAllMocks());
  it('loads devices without requesting sensitive token fields', async () => {
    httpClient.get.mockResolvedValue({ data: { data: { devices: [] } } });
    await securityService.devices();
    expect(httpClient.get).toHaveBeenCalledWith('/security/devices');
  });
  it('sends password confirmation in the DELETE request body', async () => {
    httpClient.delete.mockResolvedValue({ data: {} });
    await securityService.revoke('device-id', { password: 'confirmation' });
    expect(httpClient.delete).toHaveBeenCalledWith('/security/devices/device-id/trust', {
      data: { password: 'confirmation' },
    });
  });
});
