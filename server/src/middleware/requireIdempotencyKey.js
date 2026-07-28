import { AppError } from '../utils/AppError.js';

export function requireIdempotencyKey(req, _res, next) {
  const key = req.get('idempotency-key');
  if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) {
    return next(
      new AppError(
        'A valid Idempotency-Key header containing 8–128 safe characters is required',
        400,
      ),
    );
  }
  req.idempotencyKey = key;
  return next();
}
