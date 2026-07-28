import httpClient from '../api/httpClient';

const data = (response) => response.data;

export const transactionService = {
  transfer: (payload, idempotencyKey) =>
    httpClient
      .post('/transactions/transfer', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then(data),
  history: (params) => httpClient.get('/transactions/history', { params }).then(data),
  details: (transactionId) => httpClient.get(`/transactions/${transactionId}`).then(data),
  receipt: (transactionId) => httpClient.get(`/transactions/${transactionId}/receipt`).then(data),
  monitor: (params) => httpClient.get('/transactions/monitor', { params }).then(data),
};
