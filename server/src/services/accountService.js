import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { AppError } from '../utils/AppError.js';
import { generateUniqueAccountNumber } from '../utils/accountNumber.js';
import { maskAccountNumber } from '../utils/masking.js';
import { createAuditLog } from './auditService.js';
import { createNotification } from './notificationService.js';

const LEGACY_DEFAULT_BRANCH_CODE = 'CMB01';

function maskedNumber(value) {
  return value ? maskAccountNumber(value) : 'Pending approval';
}

export function presentAccount(account, viewerRole = 'customer', includeFullNumber = false) {
  const value = account.toObject ? account.toObject() : { ...account };
  const fullNumber = value.accountNumber;
  const safe = {
    _id: value._id,
    user: value.owner,
    accountType: value.accountType,
    currency: value.currency,
    balanceMinor: value.ledgerBalanceMinor,
    availableBalanceMinor: value.availableBalanceMinor,
    balanceDisplay: `${value.currency} ${(value.ledgerBalanceMinor / 100).toFixed(2)}`,
    availableBalanceDisplay: `${value.currency} ${(value.availableBalanceMinor / 100).toFixed(2)}`,
    status: value.status,
    branchCode: value.branchCode,
    maskedAccountNumber: maskedNumber(fullNumber),
    createdAt: value.createdAt,
    approvedAt: value.approvedAt,
  };
  if (includeFullNumber && viewerRole === 'customer' && fullNumber) safe.accountNumber = fullNumber;
  if (viewerRole !== 'customer') {
    safe.approvedBy = value.approvedBy;
    safe.suspendedBy = value.suspendedBy;
    safe.suspendedAt = value.suspendedAt;
    safe.suspensionReason = value.suspensionReason;
    safe.closedAt = value.closedAt;
    safe.reviewNote = value.reviewNote;
  }
  return safe;
}

export async function applyForAccount(userId, input, metadata = {}) {
  const existing = await Account.exists({
    owner: userId,
    accountType: input.accountType,
    status: 'pending',
  });
  if (existing)
    throw new AppError('A pending application already exists for this account type', 409);
  const account = await Account.create({
    owner: userId,
    createdBy: userId,
    accountType: input.accountType,
    branchCode: input.branchCode,
    status: 'pending',
    ledgerBalanceMinor: 0,
    availableBalanceMinor: 0,
  });
  await createAuditLog({
    actor: userId,
    action: 'ACCOUNT_APPLICATION_CREATED',
    targetType: 'Account',
    targetId: account._id,
    before: null,
    after: { accountType: account.accountType, branchCode: account.branchCode, status: 'pending' },
    metadata,
  });
  return presentAccount(account);
}

export async function listCustomerAccounts(userId) {
  const accounts = await Account.find({ owner: userId })
    .select('+accountNumber')
    .sort({ createdAt: -1 });
  return accounts.map((account) => presentAccount(account));
}

export async function getAuthorizedAccount(accountId, user) {
  const account = await Account.findById(accountId)
    .select('+accountNumber')
    .populate('owner', 'firstName lastName email phoneNumber');
  if (!account) throw new AppError('Account not found', 404);
  const ownerId = account.owner?._id || account.owner;
  if (user.role === 'customer' && ownerId.toString() !== user._id.toString()) {
    throw new AppError('Account not found', 404);
  }
  return presentAccount(account, user.role, true);
}

export async function listPendingAccounts() {
  const accounts = await Account.find({ status: 'pending' })
    .populate('owner', 'firstName lastName email phoneNumber')
    .sort({ createdAt: 1 });
  return accounts.map((account) => presentAccount(account, 'employee'));
}

export async function searchAccounts(filters) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.$or = [
      { accountNumber: filters.search },
      { branchCode: { $regex: filters.search, $options: 'i' } },
    ];
  }
  const accounts = await Account.find(query)
    .select('+accountNumber')
    .populate('owner', 'firstName lastName email phoneNumber')
    .sort({ createdAt: -1 })
    .limit(50);
  return accounts.map((account) => presentAccount(account, 'employee', true));
}

async function notifyAndAudit(account, actor, action, before, metadata, title, message) {
  await createAuditLog({
    actor: actor._id,
    action,
    targetType: 'Account',
    targetId: account._id,
    before,
    after: { status: account.status },
    metadata,
  });
  await createNotification({
    recipient: account.owner,
    type: 'account',
    title,
    message,
    targetType: 'Account',
    targetId: account._id,
  });
}

export async function approveAccount(accountId, reviewer, metadata) {
  const account = await Account.findById(accountId).select('+accountNumber');
  if (!account) throw new AppError('Account not found', 404);
  if (account.status !== 'pending')
    throw new AppError('Only pending accounts can be approved', 409);
  const before = { status: account.status };

  // Applications created before Phase 3 do not have the required provenance
  // and branch fields. Backfill them at the review boundary so existing
  // customer applications can be approved without weakening validation for
  // newly created accounts.
  if (!account.createdBy) account.createdBy = account.owner;
  if (!account.branchCode) account.branchCode = LEGACY_DEFAULT_BRANCH_CODE;

  account.status = 'active';
  account.approvedBy = reviewer._id;
  account.approvedAt = new Date();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    account.accountNumber = await generateUniqueAccountNumber();
    try {
      await account.save();
      break;
    } catch (error) {
      if (error.code !== 11000 || attempt === 4) throw error;
      account.accountNumber = null;
    }
  }
  await notifyAndAudit(
    account,
    reviewer,
    'ACCOUNT_APPROVED',
    before,
    metadata,
    'Account approved',
    `Your ${account.accountType} account is now active.`,
  );
  return presentAccount(account, reviewer.role, true);
}

export async function rejectAccount(accountId, reviewer, reason, metadata) {
  const account = await Account.findById(accountId);
  if (!account) throw new AppError('Account not found', 404);
  if (account.status !== 'pending')
    throw new AppError('Only pending accounts can be rejected', 409);
  const before = { status: account.status };
  account.status = 'closed';
  account.reviewNote = reason;
  account.closedAt = new Date();
  await account.save();
  await notifyAndAudit(
    account,
    reviewer,
    'ACCOUNT_REJECTED',
    before,
    metadata,
    'Account application declined',
    `Your ${account.accountType} application was declined.`,
  );
  return presentAccount(account, reviewer.role);
}

export async function validateAccountClosure(account) {
  const unresolvedTransfer = await Transaction.exists({
    $or: [{ senderAccount: account._id }, { receiverAccount: account._id }],
    status: { $in: ['pending', 'processing'] },
  });
  if (unresolvedTransfer) {
    throw new AppError('Account cannot be closed while a transfer is unresolved', 409);
  }
  // Future phases must also check loans, holds, and disputes.
  return true;
}

export async function changeAccountStatus(accountId, actor, status, reason, metadata) {
  const account = await Account.findById(accountId).select('+accountNumber');
  if (!account) throw new AppError('Account not found', 404);
  if (account.status === 'pending')
    throw new AppError('Pending accounts must be reviewed first', 409);
  if (account.status === 'closed') throw new AppError('Closed accounts cannot be reactivated', 409);
  if (status === 'closed' && actor.role !== 'admin')
    throw new AppError('Only administrators can close accounts', 403);
  if (status === account.status) throw new AppError(`Account is already ${status}`, 409);
  if (status === 'suspended' && !reason) throw new AppError('A suspension reason is required', 422);
  if (status === 'closed') await validateAccountClosure(account);

  const before = { status: account.status };
  account.status = status;
  if (status === 'suspended') {
    account.suspendedBy = actor._id;
    account.suspendedAt = new Date();
    account.suspensionReason = reason;
  } else if (status === 'active') {
    account.suspendedBy = null;
    account.suspendedAt = null;
    account.suspensionReason = '';
  } else {
    account.closedAt = new Date();
  }
  await account.save();
  await notifyAndAudit(
    account,
    actor,
    `ACCOUNT_${status.toUpperCase()}`,
    before,
    metadata,
    `Account ${status}`,
    `Your ${account.accountType} account is now ${status}.`,
  );
  return presentAccount(account, actor.role, true);
}

// Compatibility adapter for older internal callers.
export function reviewAccount(accountId, reviewer, decision, note, metadata) {
  return decision === 'approve'
    ? approveAccount(accountId, reviewer, metadata)
    : rejectAccount(accountId, reviewer, note, metadata);
}
