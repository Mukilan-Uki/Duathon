import axios from 'axios';

export default axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: { Accept: 'application/json' },
});
