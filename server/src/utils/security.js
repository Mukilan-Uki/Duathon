import crypto from 'node:crypto';

export function createRandomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function createOtpCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(code, secret) {
  return crypto.createHmac('sha256', secret).update(code).digest('hex');
}

export function timingSafeEqualHex(left, right) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}
