import httpClient from '../api/httpClient';
const data = (response) => response.data;
export const securityService = {
  devices: () => httpClient.get('/security/devices').then(data),
  current: () => httpClient.get('/security/devices/current').then(data),
  trust: (payload) => httpClient.post('/security/devices/trust', payload).then(data),
  rename: (deviceId, deviceName) =>
    httpClient.patch(`/security/devices/${deviceId}`, { deviceName }).then(data),
  revoke: (deviceId, payload) =>
    httpClient.delete(`/security/devices/${deviceId}/trust`, { data: payload }).then(data),
  logout: (deviceId) => httpClient.post(`/security/devices/${deviceId}/logout`).then(data),
  logoutAll: (payload) => httpClient.post('/security/devices/logout-all', payload).then(data),
};
