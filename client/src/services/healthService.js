import httpClient from '../api/httpClient';

export async function getHealth() {
  const response = await httpClient.get('/health');
  return response.data.data;
}
