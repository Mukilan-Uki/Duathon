import { env } from '../config/env.js';
import OTP from '../models/OTP.js';
import { AppError } from '../utils/AppError.js';
import { createOtpCode, hashOtp, timingSafeEqualHex } from '../utils/security.js';
import { sendOtpEmail } from './emailService.js';

export async function issueOtp(user, purpose) {
  await OTP.updateMany(
    { user: user._id, purpose, consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );

  const code = createOtpCode();
  await OTP.create({
    user: user._id,
    purpose,
    codeHash: hashOtp(code, env.JWT_ACCESS_SECRET),
    expiresAt: new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000),
  });

  await sendOtpEmail({
    to: user.email,
    name: user.firstName,
    code,
    purpose,
  });
}

export async function consumeOtp(userId, purpose, code) {
  const record = await OTP.findOne({
    user: userId,
    purpose,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select('+codeHash +attempts +maxAttempts');

  if (!record || record.attempts >= record.maxAttempts) {
    throw new AppError('The security code is invalid or has expired', 400);
  }

  const matches = timingSafeEqualHex(hashOtp(code, env.JWT_ACCESS_SECRET), record.codeHash);

  if (!matches) {
    record.attempts += 1;
    if (record.attempts >= record.maxAttempts) record.consumedAt = new Date();
    await record.save();
    throw new AppError('The security code is invalid or has expired', 400);
  }

  record.consumedAt = new Date();
  await record.save();
}
