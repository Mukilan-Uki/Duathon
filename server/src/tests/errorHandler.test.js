import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler.js';

function response() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('centralized error handling', () => {
  it('does not expose unexpected error details or stack traces in test/production responses', () => {
    const res = response();
    errorHandler(new Error('database password leaked'), {}, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'An unexpected error occurred',
      errors: [],
    });
  });

  it('returns useful field errors for database validation failures', () => {
    const res = response();
    const error = {
      name: 'ValidationError',
      errors: {
        email: { path: 'email', message: 'Email is required' },
      },
    };
    errorHandler(error, {}, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Database validation failed',
        errors: [{ field: 'email', message: 'Email is required' }],
      }),
    );
  });

  it('classifies malformed JSON as a safe client error', () => {
    const res = response();
    const error = Object.assign(new SyntaxError('Unexpected token'), { status: 400, body: '{}' });
    errorHandler(error, {}, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Request body contains invalid JSON' }),
    );
  });
});
