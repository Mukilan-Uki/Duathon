import LoginHistory from '../models/LoginHistory.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { consumeOtp, issueOtp } from './otpService.js';
import { createNotification } from './notificationService.js';
import { getNumericSetting } from './settingService.js';
import { createSession } from './tokenService.js';
import { createRandomToken, hashToken, timingSafeEqualHex } from '../utils/security.js';
import { sendPasswordResetEmail } from './emailService.js';
import { env } from '../config/env.js';
import { observeLoginDevice } from './trustedDeviceService.js';

const LOCK_MINUTES = 15;

async function recordLogin(user, email, successful, reason, metadata, observation = null) {
  await LoginHistory.create({
    user: user?._id || null,
    email,
    successful,
    reason,
    ipAddress: metadata.ip,
    userAgent: metadata.userAgent,
    trustedDevice: observation?.device?._id || null,
    deviceStatus: observation?.device?.status || 'unknown',
    riskLevel: observation?.riskLevel || (successful ? 'low' : 'medium'),
    riskReasons: observation?.riskReasons || (successful ? [] : ['failed_attempts']),
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
    phoneNumber: input.phoneNumber,
    dateOfBirth: input.dateOfBirth,
    password: input.password,
  });
  await issueOtp(user, 'email_verification');
  return user;
}

export async function verifyEmail(email, code) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError('The security code is invalid or has expired', 400);
  if (user.isEmailVerified) return user;
  await consumeOtp(user._id, 'email_verification', code);
  user.isEmailVerified = true;
  user.accountStatus = 'active';
  await user.save();
  return user;
}

export async function resendVerification(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && !user.isEmailVerified) {
    try {
      await issueOtp(user, 'email_verification');
    } catch (error) {
      if (error.statusCode !== 429) throw error;
    }
  }
}

export async function loginUser(emailInput, password, metadata) {
  const maxLoginAttempts = await getNumericSetting('login_max_attempts', 5);
  const email = emailInput.toLowerCase();
  const user = await User.findOne({ email }).select(
    '+password +passwordHash +failedLoginAttempts +lockUntil',
  );

  if (!user) {
    await recordLogin(null, email, false, 'invalid_credentials', metadata);
    throw new AppError('Invalid email or password', 401);
  }

  if (user.isLocked()) {
    await recordLogin(user, email, false, 'locked', metadata);
    throw new AppError('Account temporarily locked. Try again later', 423);
  }
  if (user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
  }

  const legacyUpdates = {};
  const legacyUnsets = {};
  if (!user.password && user.passwordHash) {
    legacyUpdates.password = user.passwordHash;
    legacyUnsets.passwordHash = 1;
  }
  if (user.status) {
    legacyUpdates.accountStatus = user.status;
    legacyUnsets.status = 1;
  }
  if (user.emailVerifiedAt) {
    legacyUpdates.isEmailVerified = true;
    legacyUnsets.emailVerifiedAt = 1;
  }
  if (Object.keys(legacyUpdates).length) {
    await User.updateOne({ _id: user._id }, { $set: legacyUpdates, $unset: legacyUnsets });
    Object.assign(user, legacyUpdates);
    user.passwordHash = undefined;
    user.status = undefined;
    user.emailVerifiedAt = undefined;
    user.unmarkModified('password');
    user.unmarkModified('passwordHash');
    user.unmarkModified('accountStatus');
    user.unmarkModified('status');
    user.unmarkModified('isEmailVerified');
    user.unmarkModified('emailVerifiedAt');
  }

  if (!(await user.verifyPassword(password))) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= maxLoginAttempts) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = maxLoginAttempts;
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

  if (!user.isEmailVerified) {
    await recordLogin(user, email, false, 'unverified', metadata);
    throw new AppError('Verify your email before signing in', 403);
  }
  if (user.accountStatus === 'suspended') {
    await recordLogin(user, email, false, 'suspended', metadata);
    throw new AppError('This account is not active', 403);
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();
  const observation = await observeLoginDevice(user, metadata.deviceToken, metadata);
  await recordLogin(user, email, true, 'success', metadata, observation);
  return {
    user,
    deviceToken: observation.rawToken,
    ...(await createSession(user, { ...metadata, trustedDevice: observation.device._id })),
  };
}

export async function requestPasswordReset(email, metadata = {}) {
  const user = await User.findOne({
    email: email.toLowerCase(),
    accountStatus: { $ne: 'suspended' },
  });
  if (!user) return;
  await PasswordResetToken.updateMany(
    { user: user._id, usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  const token = createRandomToken();
  await PasswordResetToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000),
    createdByIp: metadata.ip || '',
  });
  await sendPasswordResetEmail({ to: user.email, name: user.firstName, token });
}

export async function resetPassword(token, password) {
  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('+tokenHash');
  if (!record || !timingSafeEqualHex(tokenHash, record.tokenHash)) {
    throw new AppError('The password reset token is invalid or has expired', 400);
  }
  const user = await User.findById(record.user);
  if (!user) throw new AppError('The password reset token is invalid or has expired', 400);
  record.usedAt = new Date();
  await record.save();
  user.password = password;
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
  const user = await User.findById(userId).select('+password +passwordHash');
  if (!user || !(await user.verifyPassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }
  user.password = newPassword;
  user.passwordHash = undefined;
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
