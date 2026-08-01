import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Beneficiary from '../models/Beneficiary.js';
import { AppError } from '../utils/AppError.js';
import { escapeSearchRegex, maskAccountNumber, maskPersonName } from '../utils/masking.js';
import { createAuditLog } from './auditService.js';

const mutationOptions = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
};

function runBeneficiaryMutation(work) {
  return mongoose.connection.transaction(work, mutationOptions);
}

function accountAvailability(account) {
  if (!account) return { available: false, reason: 'Beneficiary account is unavailable' };
  if (account.status !== 'active') {
    return { available: false, reason: 'Beneficiary account cannot receive transfers' };
  }
  return { available: true, reason: '' };
}

export function presentBeneficiary(beneficiary) {
  const value = beneficiary.toObject ? beneficiary.toObject() : { ...beneficiary };
  const account = value.beneficiaryAccount;
  const storedNumber = value.beneficiaryAccountNumber || value.accountNumber;
  const availability = accountAvailability(account);
  return {
    _id: value._id,
    nickname: value.nickname,
    relationship: value.relationship || 'other',
    status: value.status || 'active',
    isFavourite: Boolean(value.isFavourite),
    lastUsedAt: value.lastUsedAt || null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    accountNumber: maskAccountNumber(storedNumber),
    accountHolderName: maskPersonName(account?.owner),
    accountType: account?.accountType || '',
    available: availability.available && (value.status || 'active') === 'active',
    unavailableReason:
      (value.status || 'active') !== 'active'
        ? 'Saved beneficiary is unavailable'
        : availability.reason,
  };
}

function beneficiaryQuery(query) {
  return query.select('+beneficiaryAccountNumber +accountNumber').populate({
    path: 'beneficiaryAccount',
    select: 'accountType status owner',
    populate: { path: 'owner', select: 'firstName lastName' },
  });
}

export async function verifyBeneficiaryAccount(accountNumber) {
  const account = await Account.findOne({ accountNumber })
    .select('+accountNumber')
    .populate('owner', 'firstName lastName');
  if (!account) throw new AppError('Beneficiary account not found', 404);
  return {
    accountNumber: maskAccountNumber(account.accountNumber),
    accountHolderName: maskPersonName(account.owner),
    accountType: account.accountType,
    canReceiveTransfers: account.status === 'active',
  };
}

export async function addBeneficiary(userId, input, metadata = {}) {
  return runBeneficiaryMutation(async (session) => {
    const account = await Account.findOne({ accountNumber: input.accountNumber })
      .select('+accountNumber')
      .populate('owner', 'firstName lastName')
      .session(session);
    if (!account) throw new AppError('Beneficiary account not found', 404);
    if (account.status !== 'active') {
      throw new AppError('Beneficiary account cannot receive transfers', 409);
    }
    if (account.owner._id.toString() === userId.toString()) {
      throw new AppError('You cannot save your own account as a beneficiary', 422);
    }
    const duplicate = await Beneficiary.exists({
      owner: userId,
      beneficiaryAccount: account._id,
    }).session(session);
    if (duplicate) throw new AppError('This beneficiary account is already saved', 409);
    const [beneficiary] = await Beneficiary.create(
      [
        {
          owner: userId,
          beneficiaryAccount: account._id,
          beneficiaryAccountNumber: account.accountNumber,
          nickname: input.nickname,
          relationship: input.relationship,
          status: 'active',
        },
      ],
      { session },
    );
    await createAuditLog({
      actor: userId,
      action: 'BENEFICIARY_CREATED',
      targetType: 'Beneficiary',
      targetId: beneficiary._id,
      before: null,
      after: { nickname: beneficiary.nickname, relationship: beneficiary.relationship },
      metadata,
      session,
    });
    return presentBeneficiary({
      ...(beneficiary.toObject ? beneficiary.toObject() : beneficiary),
      beneficiaryAccount: account,
    });
  });
}

export async function listBeneficiaries(userId, filters) {
  const query = { owner: userId };
  if (filters.status === 'active') {
    query.$and = [{ $or: [{ status: 'active' }, { status: { $exists: false } }] }];
  } else if (filters.status) {
    query.status = filters.status;
  }
  if (filters.favourite === false) {
    query.$and ||= [];
    query.$and.push({
      $or: [{ isFavourite: false }, { isFavourite: { $exists: false } }],
    });
  } else if (filters.favourite === true) {
    query.isFavourite = true;
  }
  if (filters.search) {
    query.nickname = new RegExp(escapeSearchRegex(filters.search), 'i');
  }
  const sort = {
    nickname: { nickname: 1, createdAt: -1 },
    recent: { createdAt: -1 },
    lastUsed: { lastUsedAt: -1, createdAt: -1 },
  }[filters.sort];
  const skip = (filters.page - 1) * filters.limit;
  const [records, total] = await Promise.all([
    beneficiaryQuery(Beneficiary.find(query)).sort(sort).skip(skip).limit(filters.limit),
    Beneficiary.countDocuments(query),
  ]);
  return {
    beneficiaries: records.map(presentBeneficiary),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function getBeneficiary(userId, beneficiaryId) {
  const beneficiary = await beneficiaryQuery(
    Beneficiary.findOne({ _id: beneficiaryId, owner: userId }),
  );
  if (!beneficiary) throw new AppError('Beneficiary not found', 404);
  return presentBeneficiary(beneficiary);
}

export async function updateBeneficiary(userId, beneficiaryId, input, metadata = {}) {
  await runBeneficiaryMutation(async (session) => {
    const beneficiary = await Beneficiary.findOne({
      _id: beneficiaryId,
      owner: userId,
    }).session(session);
    if (!beneficiary) throw new AppError('Beneficiary not found', 404);
    if (beneficiary.status === 'blocked') {
      throw new AppError('Blocked beneficiaries cannot be updated by customers', 409);
    }
    const before = {
      nickname: beneficiary.nickname,
      relationship: beneficiary.relationship,
      isFavourite: beneficiary.isFavourite,
    };
    if (input.nickname !== undefined) beneficiary.nickname = input.nickname;
    if (input.relationship !== undefined) beneficiary.relationship = input.relationship;
    if (input.isFavourite !== undefined) beneficiary.isFavourite = input.isFavourite;
    await beneficiary.save({ session });
    await createAuditLog({
      actor: userId,
      action: 'BENEFICIARY_UPDATED',
      targetType: 'Beneficiary',
      targetId: beneficiary._id,
      before,
      after: input,
      metadata,
      session,
    });
  });
  return getBeneficiary(userId, beneficiaryId);
}

export async function removeBeneficiary(userId, beneficiaryId, metadata = {}) {
  return runBeneficiaryMutation(async (session) => {
    const beneficiary = await Beneficiary.findOne({
      _id: beneficiaryId,
      owner: userId,
    }).session(session);
    if (!beneficiary) throw new AppError('Beneficiary not found', 404);
    if (beneficiary.status === 'blocked') {
      throw new AppError('Blocked beneficiaries cannot be removed by customers', 409);
    }
    if (beneficiary.status === 'inactive') return;
    const before = { status: beneficiary.status };
    beneficiary.status = 'inactive';
    beneficiary.isFavourite = false;
    await beneficiary.save({ session });
    await createAuditLog({
      actor: userId,
      action: 'BENEFICIARY_DEACTIVATED',
      targetType: 'Beneficiary',
      targetId: beneficiary._id,
      before,
      after: { status: 'inactive' },
      metadata,
      session,
    });
  });
}

export async function restoreBeneficiary(userId, beneficiaryId, metadata = {}) {
  const restored = await runBeneficiaryMutation(async (session) => {
    const beneficiary = await Beneficiary.findOne({
      _id: beneficiaryId,
      owner: userId,
    })
      .select('+beneficiaryAccountNumber +accountNumber')
      .session(session);
    if (!beneficiary) throw new AppError('Beneficiary not found', 404);
    if (beneficiary.status === 'blocked') {
      throw new AppError('Blocked beneficiaries cannot be restored', 409);
    }
    if (beneficiary.status === 'active') return null;
    const account = await Account.findById(beneficiary.beneficiaryAccount)
      .select('+accountNumber')
      .populate('owner', 'firstName lastName')
      .session(session);
    if (!account || account.status !== 'active') {
      throw new AppError('Beneficiary account cannot receive transfers', 409);
    }
    const duplicate = await Beneficiary.exists({
      _id: { $ne: beneficiary._id },
      owner: userId,
      beneficiaryAccount: account._id,
      status: 'active',
    }).session(session);
    if (duplicate) {
      throw new AppError('An active beneficiary already exists for this account', 409);
    }
    beneficiary.status = 'active';
    await beneficiary.save({ session });
    await createAuditLog({
      actor: userId,
      action: 'BENEFICIARY_RESTORED',
      targetType: 'Beneficiary',
      targetId: beneficiary._id,
      before: { status: 'inactive' },
      after: { status: 'active' },
      metadata,
      session,
    });
    return presentBeneficiary({
      ...(beneficiary.toObject ? beneficiary.toObject() : beneficiary),
      beneficiaryAccount: account,
    });
  });
  return restored || getBeneficiary(userId, beneficiaryId);
}
