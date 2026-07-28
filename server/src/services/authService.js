import LoginHistory from '../models/LoginHistory.js';
import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { consumeOtp, issueOtp } from './otpService.js';
import { createNotification } from './notificationService.js';
import { getNumericSetting } from './settingService.js';
import { createSession } from './tokenService.js';

const LOCK_MINUTES = 15;

async function recordLogin(user, email, successful, reason, metadata) {
  await LoginHistory.create({
    user: user?._id || null,
    email,
    successful,
    reason,
    ipAddress: metadata.ip,
    userAgent: metadata.userAgent,
  });
}

export async function registerUser(input) {
  const email = input.email.toLowerCase();
  if (await User.exists({ email }))
    throw new AppError('An account with this email already exists', 409);

  const user = await User.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email,
    passwordHash: await User.hashPassword(input.password),
  });
  await issueOtp(user, 'email_verification');
  return user;
}

export async function verifyEmail(email, code) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError('The security code is invalid or has expired', 400);
  if (user.emailVerifiedAt) return user;
  await consumeOtp(user._id, 'email_verification', code);
  user.emailVerifiedAt = new Date();
  user.status = 'active';
  await user.save();
  return user;
}

export async function resendVerification(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && !user.emailVerifiedAt) await issueOtp(user, 'email_verification');
}

export async function loginUser(emailInput, password, metadata) {
  const maxLoginAttempts = await getNumericSetting('login_max_attempts', 5);
  const email = emailInput.toLowerCase();
  const user = await User.findOne({ email }).select(
    '+passwordHash +failedLoginAttempts +lockUntil',
  );

  if (!user) {
    await recordLogin(null, email, false, 'invalid_credentials', metadata);
    throw new AppError('Invalid email or password', 401);
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    await recordLogin(user, email, false, 'locked', metadata);
    throw new AppError('Account temporarily locked. Try again later', 423);
  }

  if (!(await user.verifyPassword(password))) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= maxLoginAttempts) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    if (user.lockUntil && user.lockUntil > new Date()) {
      await createNotification({
        recipient: user._id,
        type: 'security',
        title: 'Account temporarily locked',
        message: 'Your account was locked after repeated unsuccessful sign-in attempts.',
        targetType: 'User',
        targetId: user._id,
      });
    }
    await recordLogin(user, email, false, 'invalid_credentials', metadata);
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.emailVerifiedAt) {
    await recordLogin(user, email, false, 'unverified', metadata);
    throw new AppError('Verify your email before signing in', 403);
  }
  if (user.status !== 'active') {
    await recordLogin(user, email, false, 'suspended', metadata);
    throw new AppError('This account is not active', 403);
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();
  await recordLogin(user, email, true, 'success', metadata);
  return { user, ...(await createSession(user, metadata)) };
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase(), status: { $ne: 'suspended' } });
  if (user) await issueOtp(user, 'password_reset');
}

export async function resetPassword(email, code, password) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError('The security code is invalid or has expired', 400);
  await consumeOtp(user._id, 'password_reset', code);
  user.passwordHash = await User.hashPassword(password);
  user.passwordChangedAt = new Date();
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();
  await RefreshToken.updateMany(
    { user: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  await createNotification({
    recipient: user._id,
    type: 'security',
    title: 'Password reset',
    message: 'Your password was reset. Contact support immediately if this was not you.',
    targetType: 'User',
    targetId: user._id,
  });
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await user.verifyPassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }
  user.passwordHash = await User.hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();
  await RefreshToken.updateMany(
    { user: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  await createNotification({
    recipient: user._id,
    type: 'security',
    title: 'Password changed',
    message: 'Your password was changed and existing sessions were revoked.',
    targetType: 'User',
    targetId: user._id,
  });
}
