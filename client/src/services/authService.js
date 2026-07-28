import httpClient from '../api/httpClient';

const data = (response) => response.data;

export const authService = {
  register: (payload) => httpClient.post('/auth/register', payload).then(data),
  verifyEmail: (payload) => httpClient.post('/auth/verify-email', payload).then(data),
  resendVerification: (email) => httpClient.post('/auth/resend-verification', { email }).then(data),
  login: (payload) => httpClient.post('/auth/login', payload).then(data),
  refresh: () => httpClient.post('/auth/refresh').then(data),
  logout: () => httpClient.post('/auth/logout').then(data),
  forgotPassword: (email) => httpClient.post('/auth/forgot-password', { email }).then(data),
  resetPassword: (payload) => httpClient.post('/auth/reset-password', payload).then(data),
  getMe: () => httpClient.get('/auth/me').then(data),
  getLoginHistory: () => httpClient.get('/auth/login-history').then(data),
  changePassword: (payload) => httpClient.patch('/auth/change-password', payload).then(data),
};
