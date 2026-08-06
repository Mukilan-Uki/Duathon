import axios from 'axios';
import { tokenStore } from '../services/tokenStore';

// VITE_API_URL is expected to point at the API root (e.g. https://host/api). Deployments
// frequently set it to the bare host, which would send every request to a 404 path, so the
// /api suffix is normalised here rather than depending on the dashboard value being exact.
const normaliseBaseUrl = (value) => {
  const trimmed = (value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';
  return /\/api(\/v\d+)?$/.test(trimmed) ? trimmed : `${trimmed}/api`;
};

const baseURL = normaliseBaseUrl(import.meta.env.VITE_API_URL);
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
