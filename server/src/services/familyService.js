import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Account from '../models/Account.js';
import FamilyGoal from '../models/FamilyGoal.js';
import FamilyGoalContribution from '../models/FamilyGoalContribution.js';
import FamilyGroup from '../models/FamilyGroup.js';
import FamilyInvitation from '../models/FamilyInvitation.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog } from './auditService.js';
import { createNotification } from './notificationService.js';

const mutationOptions = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
};

const ADMIN_PERMISSIONS = {
  viewSharedGoals: true,
  contributeToSharedGoals: true,
  manageJuniorAccounts: true,
  approveJuniorTransactions: true,
  viewJuniorTransactions: true,
  manageFamilyMembers: true,
  createFamilyAnnouncements: true,
};

const MEMBER_PERMISSIONS = {
  viewSharedGoals: true,
  contributeToSharedGoals: true,
  manageJuniorAccounts: false,
  approveJuniorTransactions: false,
  viewJuniorTransactions: false,
  manageFamilyMembers: false,
  createFamilyAnnouncements: false,
};

function ageOn(dateOfBirth, today = new Date()) {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (today.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      today.getUTCDate() < dateOfBirth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function memberFor(family, userId) {
  return family.members.find(
    (member) =>
      (member.user?._id || member.user).toString() === userId.toString() &&
      member.status === 'active',
  );
}

function requireMember(family, userId, permission) {
  if (!family || family.status !== 'active') throw new AppError('Family not found', 404);
  const member = memberFor(family, userId);
  if (!member) throw new AppError('Family not found', 404);
  if (permission && member.role !== 'family_admin' && !member.permissions?.[permission]) {
    throw new AppError('Family permission required', 403);
  }
  return member;
}

function requireAdmin(family, userId) {
  const member = requireMember(family, userId);
  if (member.role !== 'family_admin' || !member.permissions?.manageFamilyMembers) {
    throw new AppError('Family administrator permission required', 403);
  }
  return member;
}

function safeFamily(family) {
  const value = family.toObject ? family.toObject() : family;
  return {
    _id: value._id,
    name: value.name,
    familyCode: value.familyCode,
    status: value.status,
    settings: value.settings,
    members: value.members.map((member) => ({
      _id: member._id,
      user: member.user,
      role: member.role,
      relationship: member.relationship,
      status: member.status,
      permissions: member.permissions,
      joinedAt: member.joinedAt,
      approvedAt: member.approvedAt,
    })),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

async function uniqueFamilyCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `FAM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    if (!(await FamilyGroup.exists({ familyCode: code }))) return code;
  }
  throw new AppError('Unable to generate a family code', 503);
}

export async function createFamily(userId, name, metadata) {
  const user = await User.findById(userId);
  if (
    !user ||
    user.role !== 'customer' ||
    user.accountStatus !== 'active' ||
    !user.isEmailVerified
  ) {
    throw new AppError('An active verified customer account is required', 403);
  }
  if (!user.dateOfBirth || ageOn(user.dateOfBirth) < env.ADULT_MIN_AGE) {
    throw new AppError('Adult identity information is required to create a family', 403);
  }
  if (
    await FamilyGroup.exists({
      status: 'active',
      members: { $elemMatch: { user: userId, status: 'active' } },
    })
  ) {
    throw new AppError('You already belong to an active family', 409);
  }
  const now = new Date();
  const family = await FamilyGroup.create({
    name,
    familyCode: await uniqueFamilyCode(),
    createdBy: userId,
    members: [
      {
        user: userId,
        role: 'family_admin',
        relationship: 'creator',
        status: 'active',
        permissions: ADMIN_PERMISSIONS,
        joinedAt: now,
        approvedAt: now,
      },
    ],
  });
  await createAuditLog({
    actor: userId,
    action: 'FAMILY_CREATED',
    targetType: 'FamilyGroup',
    targetId: family._id,
    before: null,
    after: { name: family.name, status: family.status },
    metadata,
  });
  return safeFamily(family);
}

export async function getFamily(familyId, userId) {
  const family = await FamilyGroup.findById(familyId).populate(
    'members.user',
    'firstName lastName email role',
  );
  requireMember(family, userId);
  return safeFamily(family);
}

export async function getMyFamily(userId) {
  const family = await FamilyGroup.findOne({
    status: 'active',
    members: { $elemMatch: { user: userId, status: 'active' } },
  }).populate('members.user', 'firstName lastName email role');
  if (!family) return null;
  return safeFamily(family);
}

export async function inviteAdult(familyId, actor, input, metadata) {
  const family = await FamilyGroup.findById(familyId);
  requireAdmin(family, actor._id);
  const invitedUser = await User.findOne({ email: input.email });
  if (!invitedUser) return null;
  if (invitedUser._id.toString() === actor._id.toString()) {
    throw new AppError('You cannot invite yourself', 422);
  }
  if (
    invitedUser.role !== 'customer' ||
    !invitedUser.isEmailVerified ||
    invitedUser.accountStatus !== 'active' ||
    !invitedUser.dateOfBirth ||
    ageOn(invitedUser.dateOfBirth) < env.ADULT_MIN_AGE
  ) {
    return null;
  }
  if (
    await FamilyGroup.exists({
      status: 'active',
      members: { $elemMatch: { user: invitedUser._id, status: 'active' } },
    })
  ) {
    throw new AppError('This customer already belongs to an active family', 409);
  }
  await FamilyInvitation.updateMany(
    {
      family: familyId,
      invitedUser: invitedUser._id,
      status: 'pending',
      expiresAt: { $lte: new Date() },
    },
    { $set: { status: 'expired', respondedAt: new Date() } },
  );
  if (
    await FamilyInvitation.exists({
      family: familyId,
      invitedUser: invitedUser._id,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
  ) {
    throw new AppError('An active invitation already exists', 409);
  }
  const invitation = await FamilyInvitation.create({
    family: familyId,
    invitedUser: invitedUser._id,
    invitedBy: actor._id,
    role: 'adult_member',
    relationship: input.relationship,
    expiresAt: new Date(Date.now() + env.FAMILY_INVITATION_EXPIRES_DAYS * 86400000),
  });
  await Promise.all([
    createNotification({
      recipient: invitedUser._id,
      type: 'account',
      title: 'Family banking invitation',
      message: `You were invited to join ${family.name}.`,
      targetType: 'FamilyInvitation',
      targetId: invitation._id,
    }),
    createAuditLog({
      actor: actor._id,
      action: 'FAMILY_INVITATION_CREATED',
      targetType: 'FamilyInvitation',
      targetId: invitation._id,
      before: null,
      after: { family: familyId, role: invitation.role },
      metadata,
    }),
  ]);
  return invitation;
}

export function listMyInvitations(userId) {
  return FamilyInvitation.find({ invitedUser: userId, status: 'pending' })
    .populate('family', 'name familyCode status')
    .populate('invitedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
}

export async function respondToInvitation(invitationId, userId, decision, metadata) {
  return mongoose.connection.transaction(async (session) => {
    const invitation = await FamilyInvitation.findOne({
      _id: invitationId,
      invitedUser: userId,
      status: 'pending',
    }).session(session);
    if (!invitation) throw new AppError('Invitation not found', 404);
    if (invitation.expiresAt <= new Date()) {
      invitation.status = 'expired';
      await invitation.save({ session });
      throw new AppError('Invitation has expired', 409);
    }
    const family = await FamilyGroup.findOne({ _id: invitation.family, status: 'active' }).session(
      session,
    );
    if (!family) throw new AppError('Family not found', 404);
    if (decision === 'accept') {
      const anotherFamily = await FamilyGroup.exists({
        _id: { $ne: family._id },
        status: 'active',
        members: { $elemMatch: { user: userId, status: 'active' } },
      }).session(session);
      if (anotherFamily) throw new AppError('You already belong to an active family', 409);
      family.members.push({
        user: userId,
        role: 'adult_member',
        relationship: invitation.relationship,
        status: 'active',
        permissions: MEMBER_PERMISSIONS,
        joinedAt: new Date(),
        invitedBy: invitation.invitedBy,
        approvedAt: new Date(),
      });
      await family.save({ session });
      invitation.status = 'accepted';
    } else {
      invitation.status = 'rejected';
    }
    invitation.respondedAt = new Date();
    await invitation.save({ session });
    await createAuditLog({
      actor: userId,
      action: `FAMILY_INVITATION_${invitation.status.toUpperCase()}`,
      targetType: 'FamilyInvitation',
      targetId: invitation._id,
      before: { status: 'pending' },
      after: { status: invitation.status },
      metadata,
      session,
    });
    return invitation;
  }, mutationOptions);
}

export async function cancelInvitation(invitationId, actor, metadata) {
  const invitation = await FamilyInvitation.findById(invitationId);
  if (!invitation || invitation.status !== 'pending')
    throw new AppError('Invitation not found', 404);
  const family = await FamilyGroup.findById(invitation.family);
  requireAdmin(family, actor._id);
  invitation.status = 'cancelled';
  invitation.respondedAt = new Date();
  await invitation.save();
  await createAuditLog({
    actor: actor._id,
    action: 'FAMILY_INVITATION_CANCELLED',
    targetType: 'FamilyInvitation',
    targetId: invitation._id,
    before: { status: 'pending' },
    after: { status: 'cancelled' },
    metadata,
  });
}

export async function updateMember(familyId, memberId, actor, input, metadata) {
  const family = await FamilyGroup.findById(familyId);
  requireAdmin(family, actor._id);
  const member = family.members.id(memberId);
  if (!member || member.status !== 'active') throw new AppError('Family member not found', 404);
  const before = { role: member.role, permissions: member.permissions.toObject() };
  if (input.role) {
    if (member.role === 'junior_member' || input.role === 'junior_member') {
      throw new AppError('Junior roles must use Junior Banking workflows', 409);
    }
    member.role = input.role;
  }
  if (input.permissions) Object.assign(member.permissions, input.permissions);
  await family.save();
  await createAuditLog({
    actor: actor._id,
    action: 'FAMILY_MEMBER_UPDATED',
    targetType: 'FamilyGroup',
    targetId: family._id,
    before,
    after: { role: member.role, permissions: member.permissions.toObject() },
    metadata,
  });
  await createNotification({
    recipient: member.user,
    type: 'account',
    title: 'Family permissions updated',
    message: `Your permissions in ${family.name} were updated.`,
    targetType: 'FamilyGroup',
    targetId: family._id,
  });
  return safeFamily(family);
}

export async function removeMember(familyId, memberId, actor, metadata) {
  const family = await FamilyGroup.findById(familyId);
  requireAdmin(family, actor._id);
  const member = family.members.id(memberId);
  if (!member || member.status !== 'active') throw new AppError('Family member not found', 404);
  if (member.user.toString() === actor._id.toString()) {
    const anotherAdmin = family.members.some(
      (candidate) =>
        candidate._id.toString() !== memberId &&
        candidate.status === 'active' &&
        candidate.role === 'family_admin',
    );
    if (!anotherAdmin)
      throw new AppError('Assign another family administrator before leaving', 409);
  }
  member.status = 'removed';
  await family.save();
  await createAuditLog({
    actor: actor._id,
    action: 'FAMILY_MEMBER_REMOVED',
    targetType: 'FamilyGroup',
    targetId: family._id,
    before: { member: member.user, status: 'active' },
    after: { member: member.user, status: 'removed' },
    metadata,
  });
  await createNotification({
    recipient: member.user,
    type: 'account',
    title: 'Family membership changed',
    message: `Your membership in ${family.name} was removed.`,
    targetType: 'FamilyGroup',
    targetId: family._id,
  });
}

export async function createGoal(familyId, actor, input, metadata) {
  const family = await FamilyGroup.findById(familyId);
  requireAdmin(family, actor._id);
  const goal = await FamilyGoal.create({ family: familyId, createdBy: actor._id, ...input });
  await createAuditLog({
    actor: actor._id,
    action: 'FAMILY_GOAL_CREATED',
    targetType: 'FamilyGoal',
    targetId: goal._id,
    before: null,
    after: { title: goal.title, targetAmountMinor: goal.targetAmountMinor },
    metadata,
  });
  return goal;
}

export async function listGoals(familyId, userId) {
  const family = await FamilyGroup.findById(familyId);
  requireMember(family, userId, 'viewSharedGoals');
  return FamilyGoal.find({ family: familyId }).sort({ createdAt: -1 });
}

export async function getGoal(familyId, goalId, userId) {
  const family = await FamilyGroup.findById(familyId);
  requireMember(family, userId, 'viewSharedGoals');
  const goal = await FamilyGoal.findOne({ _id: goalId, family: familyId });
  if (!goal) throw new AppError('Family goal not found', 404);
  return goal;
}

export async function updateGoal(familyId, goalId, actor, input, metadata) {
  const family = await FamilyGroup.findById(familyId);
  requireAdmin(family, actor._id);
  const goal = await FamilyGoal.findOne({ _id: goalId, family: familyId });
  if (!goal) throw new AppError('Family goal not found', 404);
  const before = {
    title: goal.title,
    description: goal.description,
    deadline: goal.deadline,
    status: goal.status,
  };
  Object.assign(goal, input);
  await goal.save();
  await createAuditLog({
    actor: actor._id,
    action: 'FAMILY_GOAL_UPDATED',
    targetType: 'FamilyGoal',
    targetId: goal._id,
    before,
    after: input,
    metadata,
  });
  return goal;
}

export async function cancelGoal(familyId, goalId, actor, metadata) {
  return updateGoal(familyId, goalId, actor, { status: 'cancelled' }, metadata);
}

function contributionHash(userId, goalId, input) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        userId: userId.toString(),
        goalId,
        sourceAccountId: input.sourceAccountId,
        amountMinor: input.amountMinor,
      }),
    )
    .digest('hex');
}

export async function contributeToGoal(familyId, goalId, actor, input, idempotencyKey, metadata) {
  const requestHash = contributionHash(actor._id, goalId, input);
  const previous = await FamilyGoalContribution.findOne({
    contributor: actor._id,
    idempotencyKey,
  }).select('+requestHash');
  if (previous) {
    if (previous.requestHash !== requestHash)
      throw new AppError('This idempotency key was already used for another request', 409);
    return { contribution: previous, duplicate: true };
  }
  return mongoose.connection.transaction(async (session) => {
    const family = await FamilyGroup.findById(familyId).session(session);
    requireMember(family, actor._id, 'contributeToSharedGoals');
    const goal = await FamilyGoal.findOne({
      _id: goalId,
      family: familyId,
      status: 'active',
    }).session(session);
    if (!goal) throw new AppError('Active family goal not found', 404);
    if (goal.currentAmountMinor + input.amountMinor > goal.targetAmountMinor) {
      throw new AppError('Contribution exceeds the remaining goal amount', 422);
    }
    const source = await Account.findOne({
      _id: input.sourceAccountId,
      owner: actor._id,
      status: 'active',
    })
      .select('+accountNumber')
      .session(session);
    if (!source) throw new AppError('Active owned source account required', 404);
    const debited = await Account.findOneAndUpdate(
      {
        _id: source._id,
        owner: actor._id,
        status: 'active',
        ledgerBalanceMinor: { $gte: input.amountMinor },
        availableBalanceMinor: { $gte: input.amountMinor },
      },
      {
        $inc: { ledgerBalanceMinor: -input.amountMinor, availableBalanceMinor: -input.amountMinor },
      },
      { new: true, session },
    );
    if (!debited) throw new AppError('Insufficient available balance', 422);
    const reference = `FG-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    goal.currentAmountMinor += input.amountMinor;
    if (goal.currentAmountMinor === goal.targetAmountMinor) goal.status = 'completed';
    goal.contributors.push({ user: actor._id, amountMinor: input.amountMinor, reference });
    await goal.save({ session });
    const [contribution] = await FamilyGoalContribution.create(
      [
        {
          family: familyId,
          goal: goalId,
          contributor: actor._id,
          sourceAccount: source._id,
          amountMinor: input.amountMinor,
          reference,
          idempotencyKey,
          requestHash,
        },
      ],
      { session },
    );
    await Transaction.create(
      [
        {
          owner: actor._id,
          account: source._id,
          reference,
          transferReference: reference,
          type: 'withdrawal',
          transactionType: 'withdrawal',
          direction: 'debit',
          amount: input.amountMinor,
          amountMinor: input.amountMinor,
          currency: source.currency,
          status: 'completed',
          completedAt: new Date(),
          description: `Family goal: ${goal.title}`,
          balanceAfterMinor: debited.availableBalanceMinor,
          counterpartyAccountNumber: `FAMILY-${family.familyCode}`,
        },
      ],
      { session },
    );
    await createAuditLog({
      actor: actor._id,
      action: 'FAMILY_GOAL_CONTRIBUTION',
      targetType: 'FamilyGoal',
      targetId: goal._id,
      before: { currentAmountMinor: goal.currentAmountMinor - input.amountMinor },
      after: { currentAmountMinor: goal.currentAmountMinor, amountMinor: input.amountMinor },
      metadata,
      session,
    });
    await createNotification(
      {
        recipient: actor._id,
        type: 'transaction',
        title: 'Family goal contribution',
        message: `${input.amountMinor} minor units were contributed to ${goal.title}.`,
        targetType: 'FamilyGoal',
        targetId: goal._id,
      },
      session,
    );
    return { contribution, goal, duplicate: false };
  }, mutationOptions);
}
