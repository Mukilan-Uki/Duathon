import httpClient from '../api/httpClient';
const data = (response) => response.data;
export const juniorBankingService = {
  dashboard: () => httpClient.get('/junior-banking/dashboard').then(data),
  guardianProfiles: () => httpClient.get('/junior-banking/guardian/profiles').then(data),
  controls: (id) => httpClient.get(`/junior-banking/${id}/controls`).then(data),
  updateControls: (id, payload) =>
    httpClient.patch(`/junior-banking/${id}/controls`, payload).then(data),
  allowances: (id) => httpClient.get(`/junior-banking/${id}/allowances`).then(data),
  createAllowance: (id, payload) =>
    httpClient.post(`/junior-banking/${id}/allowances`, payload).then(data),
  allowanceAction: (id, action) =>
    httpClient.patch(`/junior-banking/allowances/${id}/${action}`).then(data),
  cancelAllowance: (id) => httpClient.delete(`/junior-banking/allowances/${id}`).then(data),
  requests: () => httpClient.get('/junior-banking/transactions/my-requests').then(data),
  requestTransfer: (payload, key) =>
    httpClient
      .post('/junior-banking/transactions/request', payload, {
        headers: { 'Idempotency-Key': key },
      })
      .then(data),
  pendingApprovals: () => httpClient.get('/junior-banking/approvals/pending').then(data),
  review: (id, decision, reason = '') =>
    httpClient.patch(`/junior-banking/approvals/${id}/${decision}`, { reason }).then(data),
  goals: (id) => httpClient.get(`/junior-banking/${id}/goals`).then(data),
  createGoal: (payload) => httpClient.post('/junior-banking/goals', payload).then(data),
  contributeGoal: (id, payload, key) =>
    httpClient
      .post(`/junior-banking/goals/${id}/contribute`, payload, {
        headers: { 'Idempotency-Key': key },
      })
      .then(data),
};
