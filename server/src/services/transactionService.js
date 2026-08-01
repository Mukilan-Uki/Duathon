import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Account from '../models/Account.js';
import Beneficiary from '../models/Beneficiary.js';
import Transaction from '../models/Transaction.js';
import { AppError } from '../utils/AppError.js';
import { generateTransferReference } from '../utils/transactionReference.js';
import { createAuditLog } from './auditService.js';
import { createNotification } from './notificationService.js';
import { getNumericSetting } from './settingService.js';
import { flagAutomaticTransaction, recordSecuritySignal } from './securityMonitoringService.js';

const ACTIVE_TRANSFER_STATUSES = ['pending', 'processing', 'completed'];

function maskAccountNumber(value) {
  return value ? `•••• •••• ${value.slice(-4)}` : '';
}

function maskName(user) {
  if (!user) return '';
  const first = user.firstName || '';
  const last = user.lastName || '';
  return `${first.slice(0, 1)}${first.length > 1 ? '•'.repeat(Math.min(first.length - 1, 4)) : ''} ${last.slice(0, 1)}${last.length > 1 ? '•'.repeat(Math.min(last.length - 1, 4)) : ''}`.trim();
}

function requestFingerprint(userId, input) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        userId: userId.toString(),
        senderAccountId: input.senderAccountId,
        receiverAccountNumber: input.receiverAccountNumber,
        ...(input.beneficiaryId ? { beneficiaryId: input.beneficiaryId } : {}),
        amount: input.amount,
        description: input.description || '',
      }),
    )
    .digest('hex');
}

function startOfUtcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function safeFailureReason(error) {
  return error instanceof AppError && error.statusCode < 500
    ? error.message.slice(0, 300)
    : 'Transfer processing failed';
}

export function presentTransaction(transaction, viewer) {
  const value = transaction.toObject ? transaction.toObject() : { ...transaction };
  const viewerId = viewer?._id?.toString();
  const sent = !viewerId || value.senderUser?.toString() === viewerId;
  return {
    _id: value._id,
    reference: value.reference,
    transferReference: value.reference || value.transferReference,
    transactionType: value.transactionType || value.type,
    direction: sent ? 'sent' : 'received',
    amount: value.amount ?? value.amountMinor,
    amountMinor: value.amount ?? value.amountMinor,
    currency: value.currency,
    description: value.description,
    status: value.status,
    failureReason: value.failureReason || undefined,
    initiatedAt: value.initiatedAt || value.createdAt,
    completedAt: value.completedAt,
    senderAccount: maskAccountNumber(value.senderAccountNumber),
    receiverAccount: maskAccountNumber(
      value.receiverAccountNumber || value.counterpartyAccountNumber,
    ),
    counterpartyAccountNumber: sent
      ? maskAccountNumber(value.receiverAccountNumber || value.counterpartyAccountNumber)
      : maskAccountNumber(value.senderAccountNumber || value.counterpartyAccountNumber),
    createdAt: value.createdAt,
  };
}

async function findIdempotentResult(userId, idempotencyKey, fingerprint, session) {
  const query = Transaction.findOne({
    $or: [{ senderUser: userId }, { owner: userId, direction: 'sent' }],
    idempotencyKey,
  }).select('+idempotencyKey +requestHash +senderAccountNumber +receiverAccountNumber');
  if (session) query.session(session);
  const existing = await query;
  if (!existing) return null;
  if (existing.requestHash !== fingerprint) {
    throw new AppError('This idempotency key was already used for another request', 409);
  }
  return existing;
}

async function waitForConcurrentIdempotentResult(userId, idempotencyKey, fingerprint) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await findIdempotentResult(userId, idempotencyKey, fingerprint);
    if (existing) return existing;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return null;
}

async function getTransferLimits() {
  const [minimum, maximum, daily, maximumPerDay, suspicious] = await Promise.all([
    getNumericSetting('transfer_min_minor', env.TRANSFER_MIN_MINOR),
    getNumericSetting('transfer_max_minor', env.TRANSFER_MAX_MINOR),
    getNumericSetting('transfer_daily_limit_minor', env.TRANSFER_DAILY_LIMIT_MINOR),
    getNumericSetting('transfer_max_per_day', env.TRANSFER_MAX_PER_DAY),
    getNumericSetting('suspicious_transfer_minor', env.SUSPICIOUS_TRANSFER_MINOR),
  ]);
  return { minimum, maximum, daily, maximumPerDay, suspicious };
}

async function enforceDailyLimits(userId, amount, limits, session) {
  const pipeline = [
    {
      $match: {
        $or: [{ senderUser: userId }, { owner: userId, direction: 'sent' }],
        status: { $in: ACTIVE_TRANSFER_STATUSES },
        createdAt: { $gte: startOfUtcDay() },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ['$amount', '$amountMinor'] } },
        count: { $sum: 1 },
      },
    },
  ];
  const aggregate = Transaction.aggregate(pipeline);
  if (session) aggregate.session(session);
  const [usage = { total: 0, count: 0 }] = await aggregate;
  if (usage.total + amount > limits.daily) {
    throw new AppError('Daily transfer amount limit exceeded', 422);
  }
  if (usage.count >= limits.maximumPerDay) {
    throw new AppError('Maximum number of daily transfers reached', 422);
  }
}

export async function validateRecipient(accountNumber) {
  const account = await Account.findOne({ accountNumber })
    .select('+accountNumber')
    .populate('owner', 'firstName lastName');
  if (!account) throw new AppError('Recipient account not found', 404);
  return {
    accountHolderName: maskName(account.owner),
    accountNumber: maskAccountNumber(account.accountNumber),
    accountType: account.accountType,
    canReceiveTransfers: account.status === 'active',
  };
}

export async function transferMoney(userId, input, idempotencyKey, metadata) {
  const normalized = { ...input, amount: input.amount ?? input.amountMinor };
  const limits = await getTransferLimits();
  if (normalized.amount < limits.minimum) {
    throw new AppError(`Minimum transfer amount is ${limits.minimum} minor units`, 422);
  }
  if (normalized.amount > limits.maximum) {
    throw new AppError(`Transfer limit is ${limits.maximum} minor units`, 422);
  }

  const fingerprint = requestFingerprint(userId, normalized);
  const previous = await findIdempotentResult(userId, idempotencyKey, fingerprint);
  if (previous) {
    return { transaction: presentTransaction(previous, { _id: userId }), duplicate: true };
  }
  await enforceDailyLimits(userId, normalized.amount, limits);

  let failureContext;
  try {
    return await mongoose.connection.transaction(
      async (session) => {
        const inside = await findIdempotentResult(userId, idempotencyKey, fingerprint, session);
        if (inside) {
          return { transaction: presentTransaction(inside, { _id: userId }), duplicate: true };
        }
        await enforceDailyLimits(userId, normalized.amount, limits, session);

        const sender = await Account.findOne({ _id: normalized.senderAccountId, owner: userId })
          .select('+accountNumber')
          .session(session);
        if (!sender) throw new AppError('Sender account not found', 404);
        if (sender.status !== 'active') throw new AppError('Sender account is not active', 409);

        let beneficiary = null;
        if (normalized.beneficiaryId) {
          beneficiary = await Beneficiary.findOne({
            _id: normalized.beneficiaryId,
            owner: userId,
          }).session(session);
          if (!beneficiary) throw new AppError('Beneficiary not found', 404);
          // Beneficiaries saved before Phase 5 have no lifecycle field and are
          // treated as active everywhere else in the beneficiary boundary.
          if (beneficiary.status && beneficiary.status !== 'active') {
            throw new AppError('This beneficiary is unavailable', 409);
          }
        }
        const receiverQuery = normalized.beneficiaryId
          ? { _id: beneficiary.beneficiaryAccount }
          : { accountNumber: normalized.receiverAccountNumber };
        const receiver = await Account.findOne(receiverQuery)
          .select('+accountNumber')
          .session(session);
        if (!receiver) throw new AppError('Receiver account not found', 404);
        if (receiver.status !== 'active') throw new AppError('Receiver account is not active', 409);
        if (sender._id.equals(receiver._id)) {
          throw new AppError('Sender and receiver accounts must be different', 422);
        }
        if (sender.currency !== receiver.currency) {
          throw new AppError('Accounts must use the same currency', 422);
        }

        const reference = generateTransferReference();
        failureContext = { sender, receiver, reference, beneficiary };
        const [transaction] = await Transaction.create(
          [
            {
              owner: sender.owner,
              account: sender._id,
              counterpartyAccount: receiver._id,
              counterpartyOwner: receiver.owner,
              senderUser: sender.owner,
              receiverUser: receiver.owner,
              senderAccount: sender._id,
              receiverAccount: receiver._id,
              beneficiary: beneficiary?._id || null,
              senderAccountNumber: sender.accountNumber,
              receiverAccountNumber: receiver.accountNumber,
              reference,
              transferReference: reference,
              idempotencyKey,
              requestHash: fingerprint,
              type: 'transfer',
              transactionType: 'transfer',
              direction: 'sent',
              amount: normalized.amount,
              amountMinor: normalized.amount,
              currency: sender.currency,
              status: 'pending',
              initiatedAt: new Date(),
              description: normalized.description || '',
              balanceAfterMinor: sender.availableBalanceMinor,
              counterpartyAccountNumber: receiver.accountNumber,
              metadata: {
                ipAddress: metadata.ip || '',
                userAgent: (metadata.userAgent || '').slice(0, 300),
              },
            },
          ],
          { session },
        );

        await createAuditLog({
          actor: userId,
          action: 'TRANSFER_INITIATED',
          targetType: 'Transaction',
          targetId: transaction._id,
          before: null,
          after: {
            senderAccount: sender._id,
            receiverAccount: receiver._id,
            amount: normalized.amount,
          },
          metadata,
          session,
        });

        const debited = await Account.findOneAndUpdate(
          {
            _id: sender._id,
            owner: userId,
            status: 'active',
            availableBalanceMinor: { $gte: normalized.amount },
            ledgerBalanceMinor: { $gte: normalized.amount },
          },
          {
            $inc: {
              availableBalanceMinor: -normalized.amount,
              ledgerBalanceMinor: -normalized.amount,
            },
          },
          { new: true, session },
        ).select('+accountNumber');
        if (!debited) throw new AppError('Insufficient available balance', 422);

        const credited = await Account.findOneAndUpdate(
          { _id: receiver._id, status: 'active' },
          {
            $inc: {
              availableBalanceMinor: normalized.amount,
              ledgerBalanceMinor: normalized.amount,
            },
          },
          { new: true, session },
        );
        if (!credited) throw new AppError('Receiver account is no longer active', 409);

        transaction.status = 'completed';
        transaction.completedAt = new Date();
        transaction.balanceAfterMinor = debited.availableBalanceMinor;
        await transaction.save({ session });

        if (normalized.amount >= limits.suspicious) {
          await flagAutomaticTransaction({
            transaction: transaction._id,
            customer: sender.owner,
            category: 'transaction',
            reason: `Transfer met the configured large-transfer threshold (${limits.suspicious} minor units).`,
            session,
          });
        }

        await createAuditLog({
          actor: userId,
          action: 'TRANSFER_COMPLETED',
          targetType: 'Transaction',
          targetId: transaction._id,
          before: {
            senderBalanceMinor: sender.availableBalanceMinor,
            receiverBalanceMinor: receiver.availableBalanceMinor,
          },
          after: {
            senderBalanceMinor: debited.availableBalanceMinor,
            receiverBalanceMinor: credited.availableBalanceMinor,
          },
          metadata,
          session,
        });
        await Promise.all([
          createNotification(
            {
              recipient: sender.owner,
              type: 'transaction',
              title: 'Transfer successful',
              message: `${reference}: ${normalized.amount} minor units sent to ${maskAccountNumber(receiver.accountNumber)}.`,
              targetType: 'Transaction',
              targetId: transaction._id,
            },
            session,
          ),
          createNotification(
            {
              recipient: receiver.owner,
              type: 'transaction',
              title: 'Money received',
              message: `${reference}: ${normalized.amount} minor units received from ${maskAccountNumber(sender.accountNumber)}.`,
              targetType: 'Transaction',
              targetId: transaction._id,
            },
            session,
          ),
        ]);
        if (beneficiary) {
          const lastUsedUpdate = await Beneficiary.updateOne(
            {
              _id: beneficiary._id,
              owner: userId,
              $or: [{ status: 'active' }, { status: { $exists: false } }],
            },
            { $set: { lastUsedAt: new Date() } },
            { session },
          );
          if (lastUsedUpdate.matchedCount !== 1) {
            throw new AppError('This beneficiary is no longer available', 409);
          }
        }
        return {
          transaction: presentTransaction(transaction, { _id: userId }),
          duplicate: false,
        };
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
    );
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await waitForConcurrentIdempotentResult(
        userId,
        idempotencyKey,
        fingerprint,
      );
      if (duplicate) {
        return { transaction: presentTransaction(duplicate, { _id: userId }), duplicate: true };
      }
    }
    if (failureContext) {
      const failed = await Transaction.create({
        owner: failureContext.sender.owner,
        account: failureContext.sender._id,
        counterpartyAccount: failureContext.receiver._id,
        counterpartyOwner: failureContext.receiver.owner,
        senderUser: failureContext.sender.owner,
        receiverUser: failureContext.receiver.owner,
        senderAccount: failureContext.sender._id,
        receiverAccount: failureContext.receiver._id,
        beneficiary: failureContext.beneficiary?._id || null,
        senderAccountNumber: failureContext.sender.accountNumber,
        receiverAccountNumber: failureContext.receiver.accountNumber,
        reference: failureContext.reference,
        transferReference: failureContext.reference,
        idempotencyKey,
        requestHash: fingerprint,
        type: 'transfer',
        transactionType: 'transfer',
        direction: 'sent',
        amount: normalized.amount,
        amountMinor: normalized.amount,
        currency: failureContext.sender.currency,
        status: 'failed',
        failureReason: safeFailureReason(error),
        failedAt: new Date(),
        description: normalized.description || '',
        balanceAfterMinor: failureContext.sender.availableBalanceMinor,
        counterpartyAccountNumber: failureContext.receiver.accountNumber,
      });
      await createAuditLog({
        actor: userId,
        action: 'TRANSFER_FAILED',
        targetType: 'Transaction',
        targetId: failed._id,
        before: null,
        after: { reason: safeFailureReason(error) },
        metadata,
      });
      await createNotification({
        recipient: failureContext.sender.owner,
        type: 'transaction',
        title: 'Transfer failed',
        message: `${failureContext.reference}: the transfer could not be completed.`,
        targetType: 'Transaction',
        targetId: failed._id,
      });
      const recentFailures = await Transaction.countDocuments({
        senderUser: failureContext.sender.owner,
        status: 'failed',
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      });
      if (recentFailures >= 3) {
        await recordSecuritySignal({
          userId: failureContext.sender.owner,
          category: 'transfer_attempts',
          reason: 'Repeated transfer failures were detected within one hour.',
        });
      }
    }
    throw error;
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listTransactions({ owner, filters, staff = false }) {
  const query = staff ? {} : { $or: [{ senderUser: owner }, { receiverUser: owner }, { owner }] };
  if (filters.direction && !staff) {
    query.$or =
      filters.direction === 'sent'
        ? [{ senderUser: owner }, { owner, direction: 'sent' }]
        : [{ receiverUser: owner }, { owner, direction: 'received' }];
  }
  if (filters.type)
    query.$and = [{ $or: [{ transactionType: filters.type }, { type: filters.type }] }];
  if (filters.status) query.status = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    if (filters.dateTo) query.createdAt.$lte = new Date(`${filters.dateTo}T23:59:59.999Z`);
  }
  if (filters.search) {
    const pattern = new RegExp(escapeRegex(filters.search), 'i');
    query.$and ||= [];
    query.$and.push({
      $or: [{ reference: pattern }, { transferReference: pattern }, { description: pattern }],
    });
  }
  const sort = filters.sort === 'oldest' ? 1 : -1;
  const skip = (filters.page - 1) * filters.limit;
  const [records, total] = await Promise.all([
    Transaction.find(query)
      .select('+senderAccountNumber +receiverAccountNumber')
      .sort({ createdAt: sort })
      .skip(skip)
      .limit(filters.limit),
    Transaction.countDocuments(query),
  ]);
  return {
    transactions: records.map((record) =>
      presentTransaction(record, staff ? null : { _id: owner }),
    ),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function getTransactionForUser(transactionId, user) {
  const transaction = await Transaction.findById(transactionId).select(
    '+senderAccountNumber +receiverAccountNumber',
  );
  if (!transaction) throw new AppError('Transaction not found', 404);
  if (user.role === 'customer') {
    const userId = user._id.toString();
    const participants = [transaction.senderUser, transaction.receiverUser, transaction.owner]
      .filter(Boolean)
      .map((value) => value.toString());
    if (!participants.includes(userId)) {
      throw new AppError('You do not have permission to view this transaction', 403);
    }
  }
  return presentTransaction(transaction, user);
}

export async function createReversalFoundation(transactionId, actor, reason, metadata) {
  if (!reason?.trim()) throw new AppError('A reversal reason is required', 422);
  if (actor.role !== 'admin') throw new AppError('Administrator authorization required', 403);
  return mongoose.connection.transaction(
    async (session) => {
      const original = await Transaction.findById(transactionId)
        .select('+senderAccountNumber +receiverAccountNumber')
        .session(session);
      if (!original || original.status !== 'completed' || original.transactionType !== 'transfer') {
        throw new AppError('Only completed transfers can be reversed', 409);
      }
      if (await Transaction.exists({ reversalOf: original._id }).session(session)) {
        throw new AppError('This transaction has already been reversed', 409);
      }

      const amount = original.amount ?? original.amountMinor;
      const debitedReceiver = await Account.findOneAndUpdate(
        {
          _id: original.receiverAccount,
          status: 'active',
          availableBalanceMinor: { $gte: amount },
          ledgerBalanceMinor: { $gte: amount },
        },
        { $inc: { availableBalanceMinor: -amount, ledgerBalanceMinor: -amount } },
        { new: true, session },
      );
      if (!debitedReceiver) {
        throw new AppError('The receiving account cannot fund this reversal', 409);
      }
      const creditedSender = await Account.findOneAndUpdate(
        { _id: original.senderAccount, status: 'active' },
        { $inc: { availableBalanceMinor: amount, ledgerBalanceMinor: amount } },
        { new: true, session },
      );
      if (!creditedSender) throw new AppError('The original sender account is not active', 409);

      const reference = generateTransferReference().replace('TRF-', 'REV-');
      const [reversal] = await Transaction.create(
        [
          {
            owner: original.receiverUser,
            account: original.receiverAccount,
            counterpartyAccount: original.senderAccount,
            counterpartyOwner: original.senderUser,
            senderUser: original.receiverUser,
            receiverUser: original.senderUser,
            senderAccount: original.receiverAccount,
            receiverAccount: original.senderAccount,
            senderAccountNumber: original.receiverAccountNumber,
            receiverAccountNumber: original.senderAccountNumber,
            reference,
            transferReference: reference,
            type: 'reversal',
            transactionType: 'reversal',
            direction: 'sent',
            amount,
            amountMinor: amount,
            currency: original.currency,
            status: 'completed',
            initiatedAt: new Date(),
            completedAt: new Date(),
            description: reason.trim(),
            balanceAfterMinor: debitedReceiver.availableBalanceMinor,
            counterpartyAccountNumber: original.senderAccountNumber,
            reversalOf: original._id,
          },
        ],
        { session },
      );
      original.status = 'reversed';
      original.reversedAt = new Date();
      await original.save({ session });

      await createAuditLog({
        actor: actor._id,
        action: 'TRANSFER_REVERSED',
        targetType: 'Transaction',
        targetId: reversal._id,
        before: { originalTransaction: original._id },
        after: { reversalTransaction: reversal._id, reason: reason.trim() },
        metadata,
        session,
      });
      await Promise.all([
        createNotification(
          {
            recipient: original.senderUser,
            type: 'transaction',
            title: 'Transfer reversed',
            message: `${original.reference} was reversed. ${amount} minor units were returned.`,
            targetType: 'Transaction',
            targetId: reversal._id,
          },
          session,
        ),
        createNotification(
          {
            recipient: original.receiverUser,
            type: 'transaction',
            title: 'Received transfer reversed',
            message: `${original.reference} was reversed by the bank.`,
            targetType: 'Transaction',
            targetId: reversal._id,
          },
          session,
        ),
      ]);
      return presentTransaction(reversal, actor);
    },
    { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
  );
}
