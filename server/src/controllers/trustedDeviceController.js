import { env } from '../config/env.js';
import * as service from '../services/trustedDeviceService.js';
import { successResponse } from '../utils/apiResponse.js';
const metadata = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') || '' });
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: env.DEVICE_TRUST_DAYS * 86400000,
};
export async function list(req, res) {
  return successResponse(res, {
    data: { devices: await service.listDevices(req.user._id, req.cookies[env.DEVICE_COOKIE_NAME]) },
  });
}
export async function current(req, res) {
  return successResponse(res, {
    data: {
      device: await service.currentDevice(req.user._id, req.cookies[env.DEVICE_COOKIE_NAME]),
    },
  });
}
export async function trust(req, res) {
  const result = await service.trustDevice(
    req.user,
    req.cookies[env.DEVICE_COOKIE_NAME],
    req.body.password,
    req.body.deviceName,
    metadata(req),
  );
  res.cookie(env.DEVICE_COOKIE_NAME, result.rawToken, cookieOptions);
  return successResponse(res, {
    message: 'Current device trusted',
    data: { device: result.device },
  });
}
export async function rename(req, res) {
  const device = await service.renameDevice(
    req.user,
    req.params.deviceId,
    req.body.deviceName,
    metadata(req),
  );
  return successResponse(res, { message: 'Device renamed', data: { device } });
}
export async function revoke(req, res) {
  const current = await service.currentDevice(req.user._id, req.cookies[env.DEVICE_COOKIE_NAME]);
  const device = await service.revokeTrust(
    req.user,
    req.params.deviceId,
    req.body.password,
    req.body.reason,
    metadata(req),
  );
  if (current?._id.toString() === device._id.toString())
    res.clearCookie(env.DEVICE_COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  return successResponse(res, { message: 'Device trust removed' });
}
export async function logout(req, res) {
  await service.logoutDevice(req.user, req.params.deviceId, metadata(req));
  return successResponse(res, { message: 'Device sessions terminated' });
}
export async function logoutAll(req, res) {
  const current = req.body.preserveCurrent
    ? await service.currentDevice(req.user._id, req.cookies[env.DEVICE_COOKIE_NAME])
    : null;
  const count = await service.logoutAllDevices(
    req.user,
    req.body.password,
    current?._id,
    metadata(req),
  );
  return successResponse(res, {
    message: 'Device sessions terminated',
    data: { revokedSessions: count },
  });
}
