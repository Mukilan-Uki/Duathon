import axios from 'axios';
import { tokenStore } from '../services/tokenStore';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const httpClient = axios.create({
  baseURL,
  timeout: 1000000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

let refreshPromise;

httpClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isAuthEndpoint = ['/auth/login', '/auth/refresh', '/auth/register'].some((path) =>
      request?.url?.includes(path),
    );
    if (error.response?.status !== 401 || request?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    request._retry = true;
    refreshPromise ||= axios
      .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then((response) => {
        tokenStore.set(response.data.data.accessToken);
        return response.data.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });

    try {
      const token = await refreshPromise;
      request.headers.Authorization = `Bearer ${token}`;
      return httpClient(request);
    } catch (refreshError) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:expired'));
      return Promise.reject(refreshError);
    }
  },
);

export default httpClient;
