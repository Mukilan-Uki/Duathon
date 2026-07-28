import httpClient from '../api/httpClient';

const data = (response) => response.data.data;

export const dashboardService = {
  customer: () => httpClient.get('/dashboards/customer').then(data),
  employee: () => httpClient.get('/dashboards/employee').then(data),
  admin: () => httpClient.get('/dashboards/admin').then(data),
};
