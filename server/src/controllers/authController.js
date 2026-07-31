import { env } from '../config/env.js';
import LoginHistory from '../models/LoginHistory.js';
import User from '../models/User.js';
import {
  changePassword,
  loginUser,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../services/authService.js';
import { revokeRefreshToken, rotateRefreshToken } from '../services/tokenService.js';
import { successResponse } from '../utils/apiResponse.js';

const COOKIE_NAME = 'duothan_refresh';

function metadata(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') || '' };
}

function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: env.REFRESH_COOKIE_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth',
  });
}

export async function register(req, res) {
  const user = await registerUser(req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Registration successful. Check your email for the verification code',
    data: { user },
  });
}

export async function verify(req, res) {
  const user = await verifyEmail(req.body.email, req.body.code);
  return successResponse(res, { message: 'Email verified successfully', data: { user } });
}

export async function resend(req, res) {
  await resendVerification(req.body.email);
  return successResponse(res, {
    message: 'If the account requires verification, a new code has been sent',
  });
}

export async function login(req, res) {
  const result = await loginUser(req.body.email, req.body.password, metadata(req));
  setRefreshCookie(res, result.refreshToken);
  return successResponse(res, {
    message: 'Login successful',
    data: { accessToken: result.accessToken, user: result.user },
  });
}

export async function refresh(req, res) {
  const result = await rotateRefreshToken(req.cookies[COOKIE_NAME], metadata(req));
  setRefreshCookie(res, result.refreshToken);
  return successResponse(res, {
    message: 'Session refreshed',
    data: { accessToken: result.accessToken, user: result.user },
  });
}

export async function logout(req, res) {
  await revokeRefreshToken(req.cookies[COOKIE_NAME], metadata(req));
  clearRefreshCookie(res);
  return successResponse(res, { message: 'Logout successful' });
}

export async function forgotPassword(req, res) {
  await requestPasswordReset(req.body.email, metadata(req));
  return successResponse(res, {
    message: 'If an eligible account exists, a password reset code has been sent',
  });
}

export async function reset(req, res) {
  await resetPassword(req.body.token, req.body.password);
  clearRefreshCookie(res);
  return successResponse(res, { message: 'Password reset successfully. Please sign in' });
}

export async function updatePassword(req, res) {
  await changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
  clearRefreshCookie(res);
  return successResponse(res, { message: 'Password changed successfully. Please sign in again' });
}

export async function me(req, res) {
  const user = await User.findById(req.user._id);
  return successResponse(res, { data: { user } });
}

export async function loginHistory(req, res) {
  const history = await LoginHistory.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('-email -__v');
  return successResponse(res, { data: { history } });
}

export function adminCheck(req, res) {
  return successResponse(res, {
    message: 'Administrator authorization confirmed',
    data: { userId: req.user._id },
  });
}
