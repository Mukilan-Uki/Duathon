import { clientOrigins } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function requireTrustedOrigin(req, _res, next) {
  const trusted = new Set(clientOrigins.map(originOf).filter(Boolean));
  const origin = req.get('origin') || originOf(req.get('referer'));

  if (!origin || !trusted.has(origin)) {
    return next(new AppError('Untrusted request origin', 403));
  }
  return next();
}
