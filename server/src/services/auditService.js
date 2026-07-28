import AuditLog from '../models/AuditLog.js';

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
        before,
        after,
        ipAddress: metadata.ip,
        userAgent: metadata.userAgent,
      },
    ],
    { session },
  );
  return auditLog;
}
