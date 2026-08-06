import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';
import JuniorProfile from '../models/JuniorProfile.js';
import { AppError } from '../utils/AppError.js';
import { createRandomToken, hashToken } from '../utils/security.js';

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: 'duothan-bank',
    audience: 'duothan-client',
  });
}

export async function createSession(user, metadata, family = crypto.randomUUID()) {
  const refreshToken = jwt.sign({ sub: user._id.toString(), family }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'duothan-bank',
    audience: 'duothan-refresh',
    jwtid: createRandomToken(16),
  });
  const decodedRefresh = jwt.decode(refreshToken);
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(decodedRefresh.exp * 1000),
    createdByIp: metadata.ip,
    userAgent: metadata.userAgent,
    trustedDevice: metadata.trustedDevice || null,
  });

  return { accessToken: signAccessToken(user), refreshToken };
}

export async function rotateRefreshToken(rawToken, metadata) {
  if (!rawToken) throw new AppError('Authentication required', 401);
  let payload;
  try {
    payload = jwt.verify(rawToken, env.JWT_REFRESH_SECRET, {
      issuer: 'duothan-bank',
      audience: 'duothan-refresh',
    });
  } catch {
    throw new AppError('Invalid or expired session', 401);
  }
  const tokenHash = hashToken(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash }).select('+tokenHash +replacedByToken');

  if (!stored) throw new AppError('Invalid session', 401);
  if (stored.user.toString() !== payload.sub || stored.family !== payload.family) {
    throw new AppError('Invalid session', 401);
  }

  if (stored.revokedAt) {
    await RefreshToken.updateMany(
      { family: stored.family, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedByIp: metadata.ip || '' } },
    );
    throw new AppError('Session reuse detected; please sign in again', 401);
  }

  if (stored.expiresAt <= new Date()) throw new AppError('Session expired', 401);

  const user = await User.findById(stored.user);
  if (!user || (user.accountStatus || user.status) !== 'active') {
    throw new AppError('Invalid session', 401);
  }

  const next = await createSession(
    user,
    { ...metadata, trustedDevice: stored.trustedDevice },
    stored.family,
  );
  stored.revokedAt = new Date();
  stored.revokedByIp = metadata.ip;
  stored.replacedByToken = hashToken(next.refreshToken);
  await stored.save();
  user.isJunior = Boolean(await JuniorProfile.exists({ juniorUser: user._id, status: { $ne: 'closed' } }));
  await user.save();
  return { ...next, user };
}

export async function revokeRefreshToken(rawToken, metadata = {}) {
  if (!rawToken) return;
  const stored = await RefreshToken.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date(), revokedByIp: metadata.ip || '' } },
    { new: true },
  ).select('user');
  return stored?.user || null;
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'duothan-bank',
    audience: 'duothan-client',
  });
}
