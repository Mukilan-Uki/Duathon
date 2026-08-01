import httpClient from '../api/httpClient';

const data = (response) => response.data;

export const beneficiaryService = {
  list: (params = {}) => httpClient.get('/beneficiaries', { params }).then(data),
  get: (beneficiaryId) => httpClient.get(`/beneficiaries/${beneficiaryId}`).then(data),
  verifyAccount: (accountNumber) =>
    httpClient.post('/beneficiaries/verify-account', { accountNumber }).then(data),
  add: (payload) => httpClient.post('/beneficiaries', payload).then(data),
  update: (beneficiaryId, payload) =>
    httpClient.patch(`/beneficiaries/${beneficiaryId}`, payload).then(data),
  remove: (beneficiaryId) => httpClient.delete(`/beneficiaries/${beneficiaryId}`).then(data),
  restore: (beneficiaryId) =>
    httpClient.patch(`/beneficiaries/${beneficiaryId}/restore`).then(data),
};
