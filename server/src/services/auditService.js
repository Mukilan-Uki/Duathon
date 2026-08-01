import AuditLog from '../models/AuditLog.js';

const SENSITIVE_KEYS = /password|token|secret|otp|authorization|cookie/i;

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEYS.test(key) ? '[REDACTED]' : redact(item),
    ]),
  );
}

export async function createAuditLog({
  actor,
  action,
  targetType,
  targetId,
  before,
  after,
  metadata,
  session,
}) {
  const [auditLog] = await AuditLog.create(
    [
      {
        actor,
        action,
        targetType,
        targetId,
        before: redact(before),
        after: redact(after),
        ipAddress: metadata.ip,
        userAgent: metadata.userAgent,
        requestMethod: metadata.method || '',
        outcome: metadata.outcome || 'success',
      },
    ],
    { session },
  );
  return auditLog;
}
