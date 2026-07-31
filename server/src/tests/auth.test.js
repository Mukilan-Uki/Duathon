import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/AppError.js';

vi.mock('../services/authService.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  };
});

vi.mock('../services/tokenService.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    rotateRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
  };
});

vi.mock('../middleware/authenticate.js', () => ({
  authenticate(req, _res, next) {
    if (req.get('authorization') !== 'Bearer valid-access-token') {
      return next(new AppError('Authentication required', 401));
    }
    req.user = {
      _id: '507f1f77bcf86cd799439011',
      role: req.get('x-test-role') || 'customer',
    };
    return next();
  },
}));

vi.mock('../models/User.js', () => ({
  default: {
    findById: vi.fn().mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      email: 'amina@example.com',
      role: 'customer',
      accountStatus: 'active',
    }),
  },
}));

const { loginUser, registerUser, requestPasswordReset, resetPassword } =
  await import('../services/authService.js');
const { revokeRefreshToken, rotateRefreshToken } = await import('../services/tokenService.js');
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
        phoneNumber: '+94771234567',
        password: 'StrongPass!123',
        confirmPassword: 'StrongPass!123',
      })
      .expect(201);
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate registration consistently', async () => {
    registerUser.mockRejectedValue(new AppError('An account with this email already exists', 409));
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Amina',
        lastName: 'Silva',
        email: 'amina@example.com',
        phoneNumber: '+94771234567',
        password: 'StrongPass!123',
        confirmPassword: 'StrongPass!123',
      })
      .expect(409);
    expect(response.body.success).toBe(false);
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

  it('uses a generic response for invalid login credentials', async () => {
    loginUser.mockRejectedValue(new AppError('Invalid email or password', 401));
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'amina@example.com', password: 'WrongPassword' })
      .expect(401);
    expect(response.body.message).toBe('Invalid email or password');
  });

  it('reports a temporarily locked account', async () => {
    loginUser.mockRejectedValue(new AppError('Account temporarily locked. Try again later', 423));
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'amina@example.com', password: 'StrongPass!123' })
      .expect(423);
  });

  it('rejects unauthenticated protected-route access', async () => {
    const response = await request(app).get('/api/auth/me').expect(401);
    expect(response.body.message).toBe('Authentication required');
  });

  it('allows protected-route access with a valid access token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid-access-token')
      .expect(200);
    expect(response.body.data.user.email).toBe('amina@example.com');
  });

  it('rotates the refresh token and replaces the cookie', async () => {
    rotateRefreshToken.mockResolvedValue({
      accessToken: 'rotated-access',
      refreshToken: 'rotated-refresh',
      user: { role: 'customer' },
    });
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', 'duothan_refresh=old-refresh')
      .expect(200);
    expect(response.body.data.accessToken).toBe('rotated-access');
    expect(response.headers['set-cookie'][0]).toContain('rotated-refresh');
  });

  it('clears a stale refresh cookie when rotation fails', async () => {
    rotateRefreshToken.mockRejectedValue(new AppError('Invalid session', 401));
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', 'duothan_refresh=stale-refresh')
      .expect(401);
    expect(response.headers['set-cookie'][0]).toContain('duothan_refresh=;');
  });

  it('revokes the refresh token during logout', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', 'duothan_refresh=current-refresh')
      .expect(200);
    expect(revokeRefreshToken).toHaveBeenCalledWith(
      'current-refresh',
      expect.objectContaining({ ip: expect.any(String) }),
    );
  });

  it('returns the same forgot-password response for every email', async () => {
    const first = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'known@example.com' })
      .expect(200);
    const second = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown@example.com' })
      .expect(200);
    expect(first.body.message).toBe(second.body.message);
    expect(requestPasswordReset).toHaveBeenCalledTimes(2);
  });

  it('resets a password using a secure token', async () => {
    const token = 'a'.repeat(64);
    await request(app)
      .post('/api/auth/reset-password')
      .send({
        token,
        password: 'NewStrongPass!123',
        confirmPassword: 'NewStrongPass!123',
      })
      .expect(200);
    expect(resetPassword).toHaveBeenCalledWith(token, 'NewStrongPass!123');
  });
});

describe('role authorization middleware', () => {
  it('rejects a customer from an administrator action', () => {
    const next = vi.fn();
    authorize('admin')({ user: { role: 'customer' } }, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('allows an administrator role', () => {
    const next = vi.fn();
    authorize('admin')({ user: { role: 'admin' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });
});
