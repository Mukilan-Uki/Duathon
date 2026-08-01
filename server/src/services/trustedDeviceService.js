import crypto from 'node:crypto';
import { env } from '../config/env.js';
import LoginHistory from '../models/LoginHistory.js';
import RefreshToken from '../models/RefreshToken.js';
import TrustedDevice from '../models/TrustedDevice.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { createRandomToken } from '../utils/security.js';
import { createAuditLog } from './auditService.js';
import { createNotification } from './notificationService.js';

export const deviceTokenHash = (token) =>
  crypto.createHmac('sha256', env.DEVICE_TOKEN_SECRET).update(token).digest('hex');
function describe(userAgent = '') {
  const mobile = /Mobile|Android|iPhone/i.test(userAgent);
  const tablet = /iPad|Tablet/i.test(userAgent);
  const browser = /Edg/i.test(userAgent)
    ? 'Edge'
    : /Chrome/i.test(userAgent)
      ? 'Chrome'
      : /Firefox/i.test(userAgent)
        ? 'Firefox'
        : /Safari/i.test(userAgent)
          ? 'Safari'
          : 'Unknown';
  const operatingSystem = /Windows/i.test(userAgent)
    ? 'Windows'
    : /Android/i.test(userAgent)
      ? 'Android'
      : /iPhone|iPad|Mac OS/i.test(userAgent)
        ? 'Apple'
        : /Linux/i.test(userAgent)
          ? 'Linux'
          : 'Unknown';
  return {
    deviceType: tablet ? 'tablet' : mobile ? 'mobile' : userAgent ? 'desktop' : 'unknown',
    browser,
    operatingSystem,
    userAgentSummary: `${browser} on ${operatingSystem}`,
  };
}
const safe = (device, currentHash) => ({
  _id: device._id,
  deviceName: device.deviceName,
  deviceType: device.deviceType,
  browser: device.browser,
  operatingSystem: device.operatingSystem,
  userAgentSummary: device.userAgentSummary,
  firstSeenAt: device.firstSeenAt,
  lastSeenAt: device.lastSeenAt,
  lastLoginIp: device.lastLoginIp,
  trustedAt: device.trustedAt,
  trustedUntil: device.trustedUntil,
  status: device.status,
  current: currentHash ? device.deviceIdHash === currentHash : false,
});

export async function observeLoginDevice(user, rawToken, metadata) {
  const token = rawToken || createRandomToken();
  const hash = deviceTokenHash(token);
  let device = await TrustedDevice.findOne({ deviceIdHash: hash }).select('+deviceIdHash');
  if (device && device.user.toString() !== user._id.toString()) device = null;
  const details = describe(metadata.userAgent);
  if (!device) {
    device = await TrustedDevice.create({
      user: user._id,
      deviceIdHash: hash,
      deviceName: `${details.browser} ${details.deviceType}`,
      ...details,
      lastLoginIp: metadata.ip,
    });
    await createNotification({
      recipient: user._id,
      type: 'security',
      title: 'New device sign-in',
      message: `A new ${details.deviceType} signed in to your account.`,
      targetType: 'TrustedDevice',
      targetId: device._id,
    });
    return { device, rawToken: token, riskLevel: 'medium', riskReasons: ['new_device'] };
  }
  if (device.status === 'trusted' && device.trustedUntil <= new Date()) device.status = 'expired';
  const changedIp = Boolean(device.lastLoginIp && device.lastLoginIp !== metadata.ip);
  device.lastSeenAt = new Date();
  device.lastLoginIp = metadata.ip;
  await device.save();
  return {
    device,
    rawToken: rawToken ? null : token,
    riskLevel: ['revoked', 'blocked'].includes(device.status)
      ? 'high'
      : changedIp
        ? 'medium'
        : 'low',
    riskReasons: ['revoked', 'blocked'].includes(device.status)
      ? ['revoked_device']
      : changedIp
        ? ['changed_ip']
        : [],
  };
}

async function confirmPassword(userId, password) {
  const user = await User.findById(userId).select('+password +passwordHash');
  if (!user || !(await user.verifyPassword(password)))
    throw new AppError('Password confirmation failed', 401);
  return user;
}
export async function listDevices(userId, rawToken) {
  const currentHash = rawToken ? deviceTokenHash(rawToken) : '';
  const devices = await TrustedDevice.find({ user: userId })
    .select('+deviceIdHash')
    .sort({ lastSeenAt: -1 });
  return devices.map((item) => safe(item, currentHash));
}
export async function currentDevice(userId, rawToken) {
  if (!rawToken) return null;
  const hash = deviceTokenHash(rawToken);
  const device = await TrustedDevice.findOne({ user: userId, deviceIdHash: hash }).select(
    '+deviceIdHash',
  );
  return device ? safe(device, hash) : null;
}
export async function trustDevice(user, rawToken, password, name, metadata) {
  await confirmPassword(user._id, password);
  const token = rawToken || createRandomToken();
  const hash = deviceTokenHash(token);
  const details = describe(metadata.userAgent);
  const device = await TrustedDevice.findOneAndUpdate(
    { user: user._id, deviceIdHash: hash },
    {
      $set: {
        deviceName: name || `${details.browser} ${details.deviceType}`,
        ...details,
        status: 'trusted',
        trustedAt: new Date(),
        trustedUntil: new Date(Date.now() + env.DEVICE_TRUST_DAYS * 86400000),
        revokedAt: null,
        revokedReason: '',
        lastSeenAt: new Date(),
        lastLoginIp: metadata.ip,
      },
      $setOnInsert: { firstSeenAt: new Date() },
    },
    { new: true, upsert: true, runValidators: true },
  ).select('+deviceIdHash');
  await createNotification({
    recipient: user._id,
    type: 'security',
    title: 'Device trusted',
    message: `${device.deviceName} was marked as trusted.`,
    targetType: 'TrustedDevice',
    targetId: device._id,
  });
  await createAuditLog({
    actor: user._id,
    action: 'device_trusted',
    targetType: 'TrustedDevice',
    targetId: device._id,
    after: { deviceName: device.deviceName },
    metadata,
  });
  return { device: safe(device, hash), rawToken: token };
}
export async function renameDevice(user, deviceId, name, metadata) {
  const device = await TrustedDevice.findOneAndUpdate(
    { _id: deviceId, user: user._id },
    { $set: { deviceName: name } },
    { new: true, runValidators: true },
  );
  if (!device) throw new AppError('Device not found', 404);
  await createAuditLog({
    actor: user._id,
    action: 'device_renamed',
    targetType: 'TrustedDevice',
    targetId: device._id,
    after: { deviceName: name },
    metadata,
  });
  return device;
}
export async function revokeTrust(user, deviceId, password, reason, metadata) {
  await confirmPassword(user._id, password);
  const device = await TrustedDevice.findOneAndUpdate(
    { _id: deviceId, user: user._id },
    {
      $set: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedReason: reason || 'Removed by user',
      },
    },
    { new: true },
  );
  if (!device) throw new AppError('Device not found', 404);
  await RefreshToken.updateMany(
    { user: user._id, trustedDevice: device._id, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedByIp: metadata.ip } },
  );
  await createAuditLog({
    actor: user._id,
    action: 'device_trust_removed',
    targetType: 'TrustedDevice',
    targetId: device._id,
    after: { reason: device.revokedReason },
    metadata,
  });
  return device;
}
export async function logoutDevice(user, deviceId, metadata) {
  const device = await TrustedDevice.findOne({ _id: deviceId, user: user._id });
  if (!device) throw new AppError('Device not found', 404);
  await RefreshToken.updateMany(
    { user: user._id, trustedDevice: device._id, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedByIp: metadata.ip } },
  );
  await LoginHistory.updateMany(
    { user: user._id, trustedDevice: device._id, loggedOutAt: null },
    { $set: { loggedOutAt: new Date() } },
  );
  await createNotification({
    recipient: user._id,
    type: 'security',
    title: 'Device signed out',
    message: `Sessions on ${device.deviceName} were terminated.`,
    targetType: 'TrustedDevice',
    targetId: device._id,
  });
  await createAuditLog({
    actor: user._id,
    action: 'device_sessions_revoked',
    targetType: 'TrustedDevice',
    targetId: device._id,
    metadata,
  });
}
export async function logoutAllDevices(user, password, preserveDeviceId, metadata) {
  await confirmPassword(user._id, password);
  const query = { user: user._id, revokedAt: null };
  if (preserveDeviceId) query.trustedDevice = { $ne: preserveDeviceId };
  const result = await RefreshToken.updateMany(query, {
    $set: { revokedAt: new Date(), revokedByIp: metadata.ip },
  });
  await createAuditLog({
    actor: user._id,
    action: 'all_device_sessions_revoked',
    targetType: 'User',
    targetId: user._id,
    after: { count: result.modifiedCount },
    metadata,
  });
  return result.modifiedCount;
}
export async function recordDeviceLogin(user, email, observation, metadata) {
  return LoginHistory.create({
    user: user._id,
    email,
    successful: true,
    reason: 'success',
    ipAddress: metadata.ip,
    userAgent: metadata.userAgent,
    trustedDevice: observation.device._id,
    deviceStatus: observation.device.status,
    loginMethod: 'password',
    riskLevel: observation.riskLevel,
    riskReasons: observation.riskReasons,
  });
}
