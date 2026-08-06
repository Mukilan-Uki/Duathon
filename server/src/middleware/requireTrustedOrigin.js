import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function requireTrustedOrigin(req, _res, next) {
  const trusted = originOf(env.CLIENT_URL);
  const origin = req.get('origin') || originOf(req.get('referer'));

  if (!origin || origin !== trusted) {
    return next(new AppError('Untrusted request origin', 403));
  }
  return next();
}
