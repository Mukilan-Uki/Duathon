import httpClient from '../api/httpClient';

const data = (response) => response.data;

export const beneficiaryService = {
  list: () => httpClient.get('/beneficiaries').then(data),
  add: (payload) => httpClient.post('/beneficiaries', payload).then(data),
  remove: (beneficiaryId) => httpClient.delete(`/beneficiaries/${beneficiaryId}`).then(data),
};
