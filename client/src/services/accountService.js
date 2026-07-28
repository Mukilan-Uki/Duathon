import httpClient from '../api/httpClient';

const data = (response) => response.data;

export const accountService = {
  apply: (payload) => httpClient.post('/accounts', payload).then(data),
  getMine: () => httpClient.get('/accounts/me').then(data),
  getOne: (accountId) => httpClient.get(`/accounts/${accountId}`).then(data),
  getPending: () => httpClient.get('/accounts/pending').then(data),
  review: (accountId, payload) =>
    httpClient.patch(`/accounts/${accountId}/review`, payload).then(data),
  updateStatus: (accountId, payload) =>
    httpClient.patch(`/accounts/${accountId}/status`, payload).then(data),
};
