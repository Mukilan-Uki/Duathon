import AuditLog from '../models/AuditLog.js';
import SuspiciousActivity from '../models/SuspiciousActivity.js';
import SystemSetting from '../models/SystemSetting.js';
import Transaction from '../models/Transaction.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog } from './auditService.js';

export async function listAuditLogs({ page, limit, action, targetType }) {
  const query = {};
  if (action) query.action = action;
  if (targetType) query.targetType = targetType;
  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actor', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(query),
  ]);
  return { logs, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}

export function listSuspiciousActivities(status) {
  const query = status ? { status } : {};
  return SuspiciousActivity.find(query)
    .populate('transaction')
    .populate('customer', 'firstName lastName email')
    .populate('flaggedBy assignedTo notes.author', 'firstName lastName email')
    .sort({ createdAt: -1 });
}

export async function flagTransaction(transactionId, actor, reason, metadata) {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw new AppError('Transaction not found', 404);
  const existing = await SuspiciousActivity.findOne({ transaction: transactionId });
  if (existing) throw new AppError('This transaction is already flagged', 409);
  const activity = await SuspiciousActivity.create({
    transaction: transaction._id,
    customer: transaction.owner,
    reason,
    source: 'manual',
    flaggedBy: actor._id,
    assignedTo: actor._id,
  });
  await createAuditLog({
    actor: actor._id,
    action: 'TRANSACTION_FLAGGED',
    targetType: 'SuspiciousActivity',
    targetId: activity._id,
    before: null,
    after: { status: activity.status, reason },
    metadata,
  });
  return activity;
}

export async function updateInvestigation(activityId, actor, input, metadata) {
  const activity = await SuspiciousActivity.findById(activityId);
  if (!activity) throw new AppError('Suspicious activity not found', 404);
  const before = { status: activity.status, notes: activity.notes.length };
  if (input.note) activity.notes.push({ author: actor._id, text: input.note });
  if (input.status) {
    activity.status = input.status;
    activity.resolvedAt = ['resolved', 'dismissed'].includes(input.status) ? new Date() : null;
  }
  activity.assignedTo ||= actor._id;
  await activity.save();
  await createAuditLog({
    actor: actor._id,
    action: 'INVESTIGATION_UPDATED',
    targetType: 'SuspiciousActivity',
    targetId: activity._id,
    before,
    after: { status: activity.status, notes: activity.notes.length },
    metadata,
  });
  return activity;
}

export function listSystemSettings() {
  return SystemSetting.find()
    .populate('updatedBy', 'firstName lastName')
    .sort({ category: 1, key: 1 });
}

export async function upsertSystemSetting(actor, input, metadata) {
  const existing = await SystemSetting.findOne({ key: input.key });
  const counterpartKey = {
    transfer_min_minor: 'transfer_max_minor',
    transfer_max_minor: 'transfer_min_minor',
    loan_min_minor: 'loan_max_minor',
    loan_max_minor: 'loan_min_minor',
  }[input.key];
  if (counterpartKey) {
    const counterpart = await SystemSetting.findOne({ key: counterpartKey });
    if (
      counterpart &&
      ((input.key.endsWith('_min_minor') && input.value > counterpart.value) ||
        (input.key.endsWith('_max_minor') && input.value < counterpart.value))
    ) {
      throw new AppError('Minimum limit cannot exceed the corresponding maximum limit', 422);
    }
  }
  const before = existing?.toObject() || null;
  const setting = await SystemSetting.findOneAndUpdate(
    { key: input.key },
    { ...input, updatedBy: actor._id },
    { new: true, upsert: true, runValidators: true },
  );
  await createAuditLog({
    actor: actor._id,
    action: 'SYSTEM_SETTING_UPDATED',
    targetType: 'SystemSetting',
    targetId: setting._id,
    before,
    after: setting.toObject(),
    metadata,
  });
  return setting;
}
