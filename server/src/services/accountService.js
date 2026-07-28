import Account from '../models/Account.js';
import { AppError } from '../utils/AppError.js';
import { generateUniqueAccountNumber } from '../utils/accountNumber.js';
import { createAuditLog } from './auditService.js';

export async function applyForAccount(userId, input) {
  const existing = await Account.exists({ owner: userId, accountType: input.accountType });
  if (existing)
    throw new AppError(`You already have a ${input.accountType} account application`, 409);

  return Account.create({
    owner: userId,
    accountNumber: await generateUniqueAccountNumber(),
    accountType: input.accountType,
    applicationNote: input.applicationNote || '',
  });
}

export function listCustomerAccounts(userId) {
  return Account.find({ owner: userId }).select('+accountNumber').sort({ createdAt: -1 });
}

export async function getAuthorizedAccount(accountId, user) {
  const account = await Account.findById(accountId).select('+accountNumber');
  if (!account) throw new AppError('Account not found', 404);
  if (user.role === 'customer' && account.owner.toString() !== user._id.toString()) {
    throw new AppError('Account not found', 404);
  }
  return account;
}

export function listPendingAccounts() {
  return Account.find({ status: 'pending' })
    .select('+accountNumber')
    .populate('owner', 'firstName lastName email')
    .sort({ createdAt: 1 });
}

export async function reviewAccount(accountId, reviewer, decision, reviewNote, metadata) {
  const account = await Account.findById(accountId).select('+accountNumber');
  if (!account) throw new AppError('Account not found', 404);
  if (account.status !== 'pending')
    throw new AppError('Only pending accounts can be reviewed', 409);

  const before = { status: account.status, reviewNote: account.reviewNote };
  const now = new Date();
  account.status = decision === 'approve' ? 'active' : 'closed';
  account.reviewNote = reviewNote;
  account.reviewedBy = reviewer._id;
  account.reviewedAt = now;
  if (decision === 'approve') account.activatedAt = now;
  else account.closedAt = now;
  await account.save();

  await createAuditLog({
    actor: reviewer._id,
    action: decision === 'approve' ? 'ACCOUNT_APPROVED' : 'ACCOUNT_REJECTED',
    targetType: 'Account',
    targetId: account._id,
    before,
    after: { status: account.status, reviewNote: account.reviewNote },
    metadata,
  });
  return account;
}

export async function changeAccountStatus(accountId, actor, status, note, metadata) {
  const account = await Account.findById(accountId).select('+accountNumber');
  if (!account) throw new AppError('Account not found', 404);
  if (account.status === 'pending')
    throw new AppError('Pending accounts must be reviewed first', 409);
  if (account.status === 'closed') throw new AppError('Closed accounts cannot be reopened', 409);
  if (status === 'closed' && actor.role !== 'admin') {
    throw new AppError('Only administrators can close accounts', 403);
  }
  if (status === account.status) throw new AppError(`Account is already ${status}`, 409);

  const before = { status: account.status, reviewNote: account.reviewNote };
  account.status = status;
  account.reviewNote = note;
  if (status === 'active') {
    account.activatedAt ||= new Date();
    account.suspendedAt = null;
  }
  if (status === 'suspended') account.suspendedAt = new Date();
  if (status === 'closed') account.closedAt = new Date();
  await account.save();

  await createAuditLog({
    actor: actor._id,
    action: `ACCOUNT_${status.toUpperCase()}`,
    targetType: 'Account',
    targetId: account._id,
    before,
    after: { status: account.status, reviewNote: account.reviewNote },
    metadata,
  });
  return account;
}
