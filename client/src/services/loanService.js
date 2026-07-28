import httpClient from '../api/httpClient';

const data = (response) => response.data;

export const loanService = {
  apply: (payload) => httpClient.post('/loans/applications', payload).then(data),
  myApplications: () => httpClient.get('/loans/applications/me').then(data),
  staffApplications: (status) =>
    httpClient.get('/loans/applications', { params: status ? { status } : {} }).then(data),
  review: (applicationId, payload) =>
    httpClient.patch(`/loans/applications/${applicationId}/review`, payload).then(data),
  myLoans: () => httpClient.get('/loans/me').then(data),
  payments: (loanId) => httpClient.get(`/loans/${loanId}/payments`).then(data),
  pay: (loanId, payload, idempotencyKey) =>
    httpClient
      .post(`/loans/${loanId}/payments`, payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then(data),
};
