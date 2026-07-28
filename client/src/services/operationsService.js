import httpClient from '../api/httpClient';

const data = (response) => response.data;

export const operationsService = {
  notifications: (params) => httpClient.get('/operations/notifications', { params }).then(data),
  readNotification: (notificationId) =>
    httpClient.patch(`/operations/notifications/${notificationId}/read`).then(data),
  readAllNotifications: () => httpClient.patch('/operations/notifications/read-all').then(data),
  preferences: (payload) =>
    httpClient.patch('/operations/notification-preferences', payload).then(data),
  suspicious: (params) =>
    httpClient.get('/operations/suspicious-activities', { params }).then(data),
  flag: (transactionId, reason) =>
    httpClient.post(`/operations/transactions/${transactionId}/flag`, { reason }).then(data),
  investigate: (activityId, payload) =>
    httpClient.patch(`/operations/suspicious-activities/${activityId}`, payload).then(data),
  audits: (params) => httpClient.get('/operations/audit-logs', { params }).then(data),
  settings: () => httpClient.get('/operations/system-settings').then(data),
  saveSetting: (payload) => httpClient.put('/operations/system-settings', payload).then(data),
};
