import httpClient from '../api/httpClient';

const data = (response) => response.data;

export const accountService = {
  apply: (payload) => httpClient.post('/accounts/apply', payload).then(data),
  getMine: () => httpClient.get('/accounts/my-accounts').then(data),
  getOne: (accountId) => httpClient.get(`/accounts/${accountId}`).then(data),
  getPending: () => httpClient.get('/accounts/pending').then(data),
  approve: (accountId) => httpClient.patch(`/accounts/${accountId}/approve`).then(data),
  reject: (accountId, reason) =>
    httpClient.patch(`/accounts/${accountId}/reject`, { reason }).then(data),
  search: (params) => httpClient.get('/accounts/search', { params }).then(data),
  suspend: (accountId, reason) =>
    httpClient.patch(`/accounts/${accountId}/suspend`, { reason }).then(data),
  reactivate: (accountId, reason = '') =>
    httpClient.patch(`/accounts/${accountId}/reactivate`, { reason }).then(data),
  close: (accountId, reason) =>
    httpClient.patch(`/accounts/${accountId}/close`, { reason }).then(data),
};
