import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/authService.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    registerUser: vi.fn(),
    loginUser: vi.fn(),
  };
});

const { registerUser, loginUser } = await import('../services/authService.js');
const { authorize } = await import('../middleware/authorize.js');
const { default: app } = await import('../app.js');

describe('authentication API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates registration input before reaching the service', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'A', email: 'invalid', password: 'weak' })
      .expect(422);
    expect(response.body.success).toBe(false);
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('registers a customer with valid input', async () => {
    registerUser.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Amina',
      lastName: 'Silva',
      email: 'amina@example.com',
      role: 'customer',
      status: 'pending',
    });
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Amina',
        lastName: 'Silva',
        email: 'amina@example.com',
        password: 'StrongPass!123',
        confirmPassword: 'StrongPass!123',
      })
      .expect(201);
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('logs in and sets an HttpOnly refresh cookie', async () => {
    loginUser.mockResolvedValue({
      user: { _id: '507f1f77bcf86cd799439011', role: 'customer', status: 'active' },
      accessToken: 'access-token',
      refreshToken: 'opaque-refresh-token',
    });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'amina@example.com', password: 'StrongPass!123' })
      .expect(200);
    expect(response.body.data.accessToken).toBe('access-token');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.body.data).not.toHaveProperty('refreshToken');
  });

  it('rejects unauthenticated protected-route access', async () => {
    const response = await request(app).get('/api/auth/me').expect(401);
    expect(response.body.message).toBe('Authentication required');
  });
});

describe('role authorization middleware', () => {
  it('rejects a customer from an administrator action', () => {
    const next = vi.fn();
    authorize('admin')({ user: { role: 'customer' } }, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
