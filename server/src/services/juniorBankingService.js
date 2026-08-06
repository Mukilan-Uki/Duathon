import Account from '../models/Account.js';
import FamilyGroup from '../models/FamilyGroup.js';
import JuniorAllowance from '../models/JuniorAllowance.js';
import JuniorBeneficiaryPermission from '../models/JuniorBeneficiaryPermission.js';
import JuniorProfile from '../models/JuniorProfile.js';
import JuniorSavingsGoal from '../models/JuniorSavingsGoal.js';
import JuniorTransactionRequest from '../models/JuniorTransactionRequest.js';
import RefreshToken from '../models/RefreshToken.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { generateUniqueAccountNumber } from '../utils/accountNumber.js';
import { createAuditLog } from './auditService.js';
import { createNotification } from './notificationService.js';
import { transferMoney } from './transactionService.js';

const id = (value) => String(value?._id || value);
function age(date) {
  const now = new Date();
  const born = new Date(date);
  let years = now.getUTCFullYear() - born.getUTCFullYear();
  if (now < new Date(Date.UTC(now.getUTCFullYear(), born.getUTCMonth(), born.getUTCDate())))
    years -= 1;
  return years;
}
function guardian(profile, userId, permission) {
  const entry = profile.guardians.find((item) => id(item.user) === id(userId));
  if (!entry || (permission && !entry.permissions[permission]))
    throw new AppError('Guardian permission required', 403);
  return entry;
}

function periodStart(days, now = new Date()) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function requireApprovedBeneficiary(profileId, beneficiaryId) {
  if (!beneficiaryId) throw new AppError('An approved beneficiary is required', 403);
  const approved = await JuniorBeneficiaryPermission.exists({
    juniorProfile: profileId,
    beneficiary: beneficiaryId,
    status: 'approved',
  });
  if (!approved) throw new AppError('This beneficiary has not been approved for the junior', 403);
}

async function enforceSpendingLimits(profile, amountMinor) {
  const limits = [
    ['dailyLimitMinor', periodStart(1)],
    ['weeklyLimitMinor', periodStart(7)],
    ['monthlyLimitMinor', periodStart(30)],
  ];
  for (const [field, from] of limits) {
    const limit = profile.spendingLimits[field];
    if (!limit) continue;
    const [result] = await Transaction.aggregate([
      {
        $match: {
          senderUser: profile.juniorUser,
          status: 'completed',
          initiatedAt: { $gte: from },
        },
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amountMinor', '$amount'] } } } },
    ]);
    if ((result?.total || 0) + amountMinor > limit) {
      throw new AppError(`${field.replace('LimitMinor', '')} spending limit exceeded`, 422);
    }
  }
}

export async function createJuniorProfile(actor, input, metadata) {
  const family = await FamilyGroup.findById(input.familyId);
  const actorMember = family?.members.find(
    (item) => id(item.user) === id(actor._id) && item.status === 'active',
  );
  if (
    !actorMember ||
    (actorMember.role !== 'family_admin' && !actorMember.permissions.manageJuniorAccounts)
  )
    throw new AppError('Family guardian permission required', 403);
  const junior = await User.findById(input.juniorUserId);
  if (
    !junior ||
    junior.role !== 'customer' ||
    !junior.dateOfBirth ||
    age(junior.dateOfBirth) >= Number(process.env.ADULT_MIN_AGE || 18)
  )
    throw new AppError('An eligible junior customer is required', 422);
  if (family.members.some((item) => id(item.user) === id(junior._id) && item.status === 'active'))
    throw new AppError('Junior already belongs to this family', 409);
  const permissions = {
    manageControls: true,
    manageAllowances: true,
    approveTransactions: true,
    viewTransactions: true,
    manageBeneficiaries: true,
  };
  const profile = await JuniorProfile.create({
    juniorUser: junior._id,
    family: family._id,
    primaryGuardian: actor._id,
    guardians: [{ user: actor._id, relationship: input.relationshipToGuardian, permissions }],
    dateOfBirth: junior.dateOfBirth,
    relationshipToGuardian: input.relationshipToGuardian,
    spendingLimits: input.spendingLimits,
    approvalSettings: input.approvalSettings,
  });
  family.members.push({
    user: junior._id,
    role: 'junior_member',
    relationship: input.relationshipToGuardian,
    status: 'active',
    permissions: {},
    joinedAt: new Date(),
    invitedBy: actor._id,
    approvedAt: new Date(),
  });
  await family.save();
  await createAuditLog({
    actor: actor._id,
    action: 'junior_profile_created',
    targetType: 'JuniorProfile',
    targetId: profile._id,
    after: profile.toObject(),
    metadata,
  });
  return profile;
}
export async function getProfileFor(actor, juniorId, permission) {
  const profile = await JuniorProfile.findById(juniorId);
  if (!profile) throw new AppError('Junior profile not found', 404);
  if (id(profile.juniorUser) !== id(actor._id)) guardian(profile, actor._id, permission);
  return profile;
}
export async function createJuniorAccount(actor, juniorId, input, metadata) {
  const profile = await getProfileFor(actor, juniorId, 'manageControls');
  if (await Account.exists({ owner: profile.juniorUser, status: { $ne: 'closed' } }))
    throw new AppError('Junior already has an account', 409);
  const account = await Account.create({
    owner: profile.juniorUser,
    createdBy: actor._id,
    accountNumber: await generateUniqueAccountNumber(),
    accountType: 'savings',
    branchCode: input.branchCode,
    status: 'active',
    approvedBy: actor._id,
    approvedAt: new Date(),
    isJuniorRestricted: true,
  });
  profile.status = 'active';
  await profile.save();
  await createAuditLog({
    actor: actor._id,
    action: 'junior_account_created',
    targetType: 'Account',
    targetId: account._id,
    after: { juniorProfile: profile._id },
    metadata,
  });
  return account;
}
export async function getControls(actor, juniorId) {
  const profile = await getProfileFor(actor, juniorId);
  return {
    permissions: profile.permissions,
    spendingLimits: profile.spendingLimits,
    approvalSettings: profile.approvalSettings,
  };
}
export async function updateControls(actor, juniorId, input, metadata) {
  const profile = await getProfileFor(actor, juniorId, 'manageControls');
  const before = profile.toObject();
  if (input.permissions) Object.assign(profile.permissions, input.permissions);
  if (input.spendingLimits) Object.assign(profile.spendingLimits, input.spendingLimits);
  if (input.approvalSettings) Object.assign(profile.approvalSettings, input.approvalSettings);
  await profile.save();
  await createAuditLog({
    actor: actor._id,
    action: 'junior_controls_updated',
    targetType: 'JuniorProfile',
    targetId: profile._id,
    before,
    after: profile.toObject(),
    metadata,
  });
  return profile;
}
export async function createAllowance(actor, juniorId, input) {
  const profile = await getProfileFor(actor, juniorId, 'manageAllowances');
  const source = await Account.findOne({
    _id: input.sourceAccountId,
    owner: actor._id,
    status: 'active',
  });
  const destination = await Account.findOne({
    owner: profile.juniorUser,
    isJuniorRestricted: true,
    status: 'active',
  });
  if (!source || !destination)
    throw new AppError('Eligible source and junior accounts are required', 422);
  return JuniorAllowance.create({
    juniorProfile: profile._id,
    guardian: actor._id,
    sourceAccount: source._id,
    destinationAccount: destination._id,
    amountMinor: input.amountMinor,
    frequency: input.frequency,
    nextRunAt: input.nextRunAt,
    description: input.description,
  });
}

function nextAllowanceRun(frequency, value) {
  const next = new Date(value);
  if (frequency === 'weekly') next.setUTCDate(next.getUTCDate() + 7);
  if (frequency === 'monthly') next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export async function executeAllowance(actor, allowanceId, key, metadata) {
  const allowance = await JuniorAllowance.findById(allowanceId).populate('juniorProfile');
  if (!allowance) throw new AppError('Allowance not found', 404);
  guardian(allowance.juniorProfile, actor._id, 'manageAllowances');
  if (allowance.status !== 'active' || allowance.nextRunAt > new Date())
    throw new AppError('Allowance is not due', 409);
  const destination = await Account.findById(allowance.destinationAccount).select('+accountNumber');
  if (!destination) throw new AppError('Junior destination account not found', 404);
  try {
    const result = await transferMoney(
      actor._id,
      {
        senderAccountId: allowance.sourceAccount.toString(),
        receiverAccountNumber: destination.accountNumber,
        amountMinor: allowance.amountMinor,
        description: allowance.description || 'Junior allowance',
      },
      key,
      metadata,
    );
    allowance.lastRunAt = new Date();
    allowance.lastIdempotencyKey = key;
    allowance.failureReason = '';
    if (allowance.frequency === 'one_time') allowance.status = 'completed';
    else allowance.nextRunAt = nextAllowanceRun(allowance.frequency, allowance.nextRunAt);
    await allowance.save();
    return { allowance, transaction: result.transaction, duplicate: result.duplicate };
  } catch (error) {
    allowance.status = 'failed';
    allowance.failureReason = error.message.slice(0, 300);
    await allowance.save();
    throw error;
  }
}
export async function listAllowances(actor, juniorId) {
  const profile = await getProfileFor(actor, juniorId);
  return JuniorAllowance.find({ juniorProfile: profile._id }).sort({ createdAt: -1 });
}
export async function changeAllowance(actor, allowanceId, update) {
  const allowance = await JuniorAllowance.findById(allowanceId).populate('juniorProfile');
  if (!allowance) throw new AppError('Allowance not found', 404);
  guardian(allowance.juniorProfile, actor._id, 'manageAllowances');
  Object.assign(allowance, update);
  return allowance.save();
}
export async function requestTransaction(actor, input, key) {
  const profile = await JuniorProfile.findOne({ juniorUser: actor._id, status: 'active' });
  if (!profile || !profile.permissions.canTransfer)
    throw new AppError('Junior transfers are unavailable', 403);
  const account = await Account.findOne({
    _id: input.juniorAccountId,
    owner: actor._id,
    isJuniorRestricted: true,
    status: 'active',
  });
  if (!account) throw new AppError('Junior account not found', 404);
  if (
    profile.spendingLimits.perTransactionLimitMinor &&
    input.amountMinor > profile.spendingLimits.perTransactionLimitMinor
  )
    throw new AppError('Per-transaction spending limit exceeded', 422);
  await enforceSpendingLimits(profile, input.amountMinor);
  const request = await JuniorTransactionRequest.create({
    juniorProfile: profile._id,
    juniorAccount: account._id,
    receiverAccount: input.receiverAccountId,
    beneficiary: input.beneficiaryId,
    amountMinor: input.amountMinor,
    description: input.description,
    requestedBy: actor._id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    idempotencyKey: key,
  });
  const requiresApproval =
    profile.approvalSettings.requireApprovalForExternalTransfer ||
    (profile.approvalSettings.requireApprovalAboveMinor > 0 &&
      input.amountMinor > profile.approvalSettings.requireApprovalAboveMinor);
  if (!requiresApproval && input.receiverAccountId) {
    await requireApprovedBeneficiary(profile._id, input.beneficiaryId);
    const receiver = await Account.findById(input.receiverAccountId).select('+accountNumber');
    if (!receiver) throw new AppError('Receiver account not found', 404);
    const result = await transferMoney(
      actor._id,
      {
        senderAccountId: account._id.toString(),
        receiverAccountNumber: receiver.accountNumber,
        amountMinor: input.amountMinor,
        description: input.description || 'Junior transfer',
      },
      key,
      { ip: '', userAgent: 'junior-banking-service' },
      { allowJunior: true },
    );
    request.status = 'completed';
    request.transaction = result.transaction._id;
    await request.save();
  }
  return request;
}
export async function myRequests(actor) {
  return JuniorTransactionRequest.find({ requestedBy: actor._id }).sort({ createdAt: -1 });
}
export async function pendingApprovals(actor) {
  const profiles = await JuniorProfile.find({
    guardians: { $elemMatch: { user: actor._id, 'permissions.approveTransactions': true } },
  });
  return JuniorTransactionRequest.find({
    juniorProfile: { $in: profiles.map((item) => item._id) },
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: 1 });
}
export async function reviewRequest(actor, requestId, decision, reason, metadata) {
  const request = await JuniorTransactionRequest.findById(requestId).populate('juniorProfile');
  if (!request || request.status !== 'pending')
    throw new AppError('Pending transaction request not found', 404);
  guardian(request.juniorProfile, actor._id, 'approveTransactions');
  if (request.expiresAt <= new Date()) {
    request.status = 'expired';
    await request.save();
    throw new AppError('Transaction request expired', 409);
  }
  if (decision === 'approve') {
    await requireApprovedBeneficiary(request.juniorProfile._id, request.beneficiary);
    const [account, receiver] = await Promise.all([
      Account.findOne({
        _id: request.juniorAccount,
        owner: request.juniorProfile.juniorUser,
        status: 'active',
        isJuniorRestricted: true,
      }),
      Account.findById(request.receiverAccount).select('+accountNumber'),
    ]);
    if (!account || !receiver) throw new AppError('Transfer accounts are no longer eligible', 409);
    if (
      request.juniorProfile.spendingLimits.perTransactionLimitMinor &&
      request.amountMinor > request.juniorProfile.spendingLimits.perTransactionLimitMinor
    )
      throw new AppError('Per-transaction spending limit exceeded', 422);
    await enforceSpendingLimits(request.juniorProfile, request.amountMinor);
    const result = await transferMoney(
      request.juniorProfile.juniorUser,
      {
        senderAccountId: account._id.toString(),
        receiverAccountNumber: receiver.accountNumber,
        amountMinor: request.amountMinor,
        description: request.description || 'Approved junior transfer',
      },
      request.idempotencyKey,
      metadata,
      { allowJunior: true },
    );
    request.status = 'completed';
    request.transaction = result.transaction._id;
  } else request.status = 'rejected';
  request.reviewedBy = actor._id;
  request.reviewReason = reason || '';
  return request.save();
}
export async function cancelRequest(actor, requestId) {
  const request = await JuniorTransactionRequest.findOne({
    _id: requestId,
    requestedBy: actor._id,
    status: 'pending',
  });
  if (!request) throw new AppError('Pending transaction request not found', 404);
  request.status = 'cancelled';
  return request.save();
}

export async function requestBeneficiary(actor, input) {
  const profile = await JuniorProfile.findOne({ juniorUser: actor._id, status: 'active' });
  if (!profile || !profile.permissions.canRequestBeneficiaries)
    throw new AppError('Beneficiary requests are unavailable', 403);
  return JuniorBeneficiaryPermission.findOneAndUpdate(
    { juniorProfile: profile._id, beneficiary: input.beneficiaryId },
    { $set: { requestedBy: actor._id, status: 'pending', reviewedBy: null, reviewReason: '' } },
    { upsert: true, new: true, runValidators: true },
  );
}

export async function reviewBeneficiary(actor, permissionId, decision, reason) {
  const permission =
    await JuniorBeneficiaryPermission.findById(permissionId).populate('juniorProfile');
  if (!permission) throw new AppError('Beneficiary request not found', 404);
  guardian(permission.juniorProfile, actor._id, 'manageBeneficiaries');
  permission.status = decision;
  permission.reviewedBy = actor._id;
  permission.reviewReason = reason || '';
  return permission.save();
}

export async function removeBeneficiaryPermission(actor, permissionId) {
  return reviewBeneficiary(actor, permissionId, 'removed', 'Permission removed by guardian');
}

export async function convertToAdult(actor, juniorId, metadata) {
  if (!['employee', 'admin'].includes(actor.role))
    throw new AppError('Staff authorization required', 403);
  const profile = await JuniorProfile.findById(juniorId);
  if (!profile || !['active', 'suspended'].includes(profile.status))
    throw new AppError('Convertible junior profile not found', 404);
  const junior = await User.findById(profile.juniorUser);
  if (!junior?.dateOfBirth || age(junior.dateOfBirth) < Number(process.env.ADULT_MIN_AGE || 18))
    throw new AppError('Junior has not reached the configured adult age', 422);
  await Account.updateMany(
    { owner: junior._id, isJuniorRestricted: true },
    { $set: { isJuniorRestricted: false } },
  );
  await FamilyGroup.updateOne(
    { _id: profile.family, 'members.user': junior._id },
    {
      $set: {
        'members.$.role': 'adult_member',
        'members.$.permissions': { viewSharedGoals: true, contributeToSharedGoals: true },
      },
    },
  );
  profile.status = 'converted_to_adult';
  await profile.save();
  await RefreshToken.updateMany(
    { user: junior._id, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'junior_converted_to_adult' } },
  );
  await createNotification({
    recipient: junior._id,
    type: 'account',
    title: 'Junior account converted',
    message: 'Your junior restrictions have been removed after staff verification.',
  });
  await createAuditLog({
    actor: actor._id,
    action: 'junior_converted_to_adult',
    targetType: 'JuniorProfile',
    targetId: profile._id,
    after: { juniorUser: junior._id },
    metadata,
  });
  return profile;
}

export async function createJuniorGoal(actor, input) {
  const profile = await JuniorProfile.findOne({ juniorUser: actor._id, status: 'active' });
  if (!profile?.permissions.canCreateSavingsGoals)
    throw new AppError('Junior savings goals are unavailable', 403);
  return JuniorSavingsGoal.create({
    juniorProfile: profile._id,
    title: input.title,
    targetAmountMinor: input.targetAmountMinor,
    createdBy: actor._id,
  });
}
export async function listJuniorGoals(actor, juniorId) {
  const profile = await getProfileFor(actor, juniorId);
  return JuniorSavingsGoal.find({ juniorProfile: profile._id }).sort({ createdAt: -1 });
}
export async function contributeJuniorGoal(actor, goalId, input, key, metadata) {
  const goal = await JuniorSavingsGoal.findOne({ _id: goalId, status: 'active' }).populate(
    'juniorProfile',
  );
  if (!goal) throw new AppError('Active junior savings goal not found', 404);
  guardian(goal.juniorProfile, actor._id, 'manageAllowances');
  if (goal.currentAmountMinor + input.amountMinor > goal.targetAmountMinor)
    throw new AppError('Contribution exceeds remaining goal amount', 422);
  const [source, destination] = await Promise.all([
    Account.findOne({ _id: input.sourceAccountId, owner: actor._id, status: 'active' }),
    Account.findOne({
      owner: goal.juniorProfile.juniorUser,
      status: 'active',
      isJuniorRestricted: true,
    }).select('+accountNumber'),
  ]);
  if (!source || !destination)
    throw new AppError('Eligible contribution accounts are required', 422);
  const result = await transferMoney(
    actor._id,
    {
      senderAccountId: source._id.toString(),
      receiverAccountNumber: destination.accountNumber,
      amountMinor: input.amountMinor,
      description: `Junior savings: ${goal.title}`,
    },
    key,
    metadata,
  );
  if (!goal.contributions.some((item) => id(item.transaction) === id(result.transaction._id))) {
    goal.currentAmountMinor += input.amountMinor;
    goal.contributions.push({
      contributor: actor._id,
      amountMinor: input.amountMinor,
      transaction: result.transaction._id,
    });
    if (goal.currentAmountMinor === goal.targetAmountMinor) goal.status = 'completed';
    await goal.save();
  }
  return { goal, transaction: result.transaction, duplicate: result.duplicate };
}

export async function getJuniorDashboard(actor) {
  const profile = await JuniorProfile.findOne({ juniorUser: actor._id, status: 'active' });
  if (!profile) throw new AppError('Active junior profile not found', 404);
  const [account, allowances, goals, requests] = await Promise.all([
    Account.findOne({ owner: actor._id, isJuniorRestricted: true, status: 'active' }),
    JuniorAllowance.find({
      juniorProfile: profile._id,
      status: { $in: ['active', 'paused'] },
    }).sort({ nextRunAt: 1 }),
    JuniorSavingsGoal.find({ juniorProfile: profile._id }).sort({ createdAt: -1 }),
    JuniorTransactionRequest.find({ juniorProfile: profile._id }).sort({ createdAt: -1 }).limit(10),
  ]);
  return {
    profile,
    account,
    allowances,
    goals,
    requests,
    educationTips: [
      'Save a little from every allowance.',
      'Never share your password or verification codes.',
      'Review the recipient before requesting a transfer.',
    ],
  };
}

export async function listGuardianProfiles(actor) {
  return JuniorProfile.find({
    guardians: { $elemMatch: { user: actor._id } },
    status: { $in: ['pending', 'active', 'suspended'] },
  })
    .populate('juniorUser', 'firstName lastName email')
    .sort({ createdAt: -1 });
}
