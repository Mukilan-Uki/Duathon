import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../app.js';

describe('GET /api/health', () => {
  it('returns a consistent successful response', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data).not.toHaveProperty('environment');
  });

  it('uses the centralized not-found response', async () => {
    const response = await request(app).get('/api/missing').expect(404);
    expect(response.body).toMatchObject({ success: false, errors: [] });
  });
});
