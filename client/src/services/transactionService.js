import httpClient from '../api/httpClient';

const data = (response) => response.data;

export const transactionService = {
  transfer: (payload, idempotencyKey) =>
    httpClient
      .post(
        '/transfers',
        { ...payload, idempotencyKey },
        {
          headers: { 'Idempotency-Key': idempotencyKey },
        },
      )
      .then(data),
  validateRecipient: (accountNumber) =>
    httpClient.post('/transfers/validate-recipient', { accountNumber }).then(data),
  history: (params) => httpClient.get('/transactions/my-transactions', { params }).then(data),
  details: (transactionId) => httpClient.get(`/transactions/${transactionId}`).then(data),
  receipt: (transactionId) => httpClient.get(`/transactions/${transactionId}/receipt`).then(data),
  monitor: (params) => httpClient.get('/transactions/monitor', { params }).then(data),
};
