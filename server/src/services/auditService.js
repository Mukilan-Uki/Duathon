import AuditLog from '../models/AuditLog.js';

export async function createAuditLog({
  actor,
  action,
  targetType,
  targetId,
  before,
  after,
  metadata,
}) {
  return AuditLog.create({
    actor,
    action,
    targetType,
    targetId,
    before,
    after,
    ipAddress: metadata.ip,
    userAgent: metadata.userAgent,
  });
}
