import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { AppError } from '../utils/AppError.js';
import { generateTransferReference } from '../utils/transactionReference.js';
import { createAuditLog } from './auditService.js';

function requestFingerprint(userId, input) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        userId: userId.toString(),
        senderAccountId: input.senderAccountId,
        receiverAccountNumber: input.receiverAccountNumber,
        amountMinor: input.amountMinor,
        description: input.description || '',
      }),
    )
    .digest('hex');
}

async function findIdempotentResult(userId, idempotencyKey, fingerprint, session) {
  const query = Transaction.findOne({
    owner: userId,
    idempotencyKey,
    direction: 'sent',
  }).select('+idempotencyKey +requestHash');
  if (session) query.session(session);
  const existing = await query;
  if (!existing) return null;
  if (existing.requestHash !== fingerprint) {
    throw new AppError('This idempotency key was already used for another request', 409);
  }
  return existing;
}

export async function transferMoney(userId, input, idempotencyKey, metadata) {
  if (input.amountMinor < env.TRANSFER_MIN_MINOR) {
    throw new AppError(`Minimum transfer amount is ${env.TRANSFER_MIN_MINOR} minor units`, 422);
  }
  if (input.amountMinor > env.TRANSFER_MAX_MINOR) {
    throw new AppError(`Transfer limit is ${env.TRANSFER_MAX_MINOR} minor units`, 422);
  }

  const fingerprint = requestFingerprint(userId, input);
  const previous = await findIdempotentResult(userId, idempotencyKey, fingerprint);
  if (previous) return { transaction: previous, duplicate: true };

  try {
    const result = await mongoose.connection.transaction(
      async (session) => {
        const insideTransaction = await findIdempotentResult(
          userId,
          idempotencyKey,
          fingerprint,
          session,
        );
        if (insideTransaction) return { transaction: insideTransaction, duplicate: true };

        const sender = await Account.findOne({
          _id: input.senderAccountId,
          owner: userId,
        })
          .select('+accountNumber')
          .session(session);
        if (!sender) throw new AppError('Sender account not found', 404);
        if (sender.status !== 'active') throw new AppError('Sender account is not active', 409);

        const receiver = await Account.findOne({
          accountNumber: input.receiverAccountNumber,
        })
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

        const debited = await Account.findOneAndUpdate(
          {
            _id: sender._id,
            owner: userId,
            status: 'active',
            availableBalanceMinor: { $gte: input.amountMinor },
            ledgerBalanceMinor: { $gte: input.amountMinor },
          },
          {
            $inc: {
              availableBalanceMinor: -input.amountMinor,
              ledgerBalanceMinor: -input.amountMinor,
            },
          },
          { new: true, session },
        ).select('+accountNumber');
        if (!debited) throw new AppError('Insufficient available balance', 422);

        const credited = await Account.findOneAndUpdate(
          { _id: receiver._id, status: 'active' },
          {
            $inc: {
              availableBalanceMinor: input.amountMinor,
              ledgerBalanceMinor: input.amountMinor,
            },
          },
          { new: true, session },
        ).select('+accountNumber');
        if (!credited) throw new AppError('Receiver account is no longer active', 409);

        const transferReference = generateTransferReference();
        const [sentTransaction, receivedTransaction] = await Transaction.create(
          [
            {
              owner: sender.owner,
              account: sender._id,
              counterpartyAccount: receiver._id,
              counterpartyOwner: receiver.owner,
              reference: `${transferReference}-D`,
              transferReference,
              idempotencyKey,
              requestHash: fingerprint,
              type: 'transfer',
              direction: 'sent',
              amountMinor: input.amountMinor,
              currency: sender.currency,
              status: 'completed',
              description: input.description || '',
              balanceAfterMinor: debited.availableBalanceMinor,
              counterpartyAccountNumber: receiver.accountNumber,
            },
            {
              owner: receiver.owner,
              account: receiver._id,
              counterpartyAccount: sender._id,
              counterpartyOwner: sender.owner,
              reference: `${transferReference}-C`,
              transferReference,
              type: 'transfer',
              direction: 'received',
              amountMinor: input.amountMinor,
              currency: receiver.currency,
              status: 'completed',
              description: input.description || '',
              balanceAfterMinor: credited.availableBalanceMinor,
              counterpartyAccountNumber: sender.accountNumber,
            },
          ],
          { session },
        );

        await createAuditLog({
          actor: userId,
          action: 'TRANSFER_COMPLETED',
          targetType: 'Transaction',
          targetId: sentTransaction._id,
          before: {
            senderBalanceMinor: sender.availableBalanceMinor,
            receiverBalanceMinor: receiver.availableBalanceMinor,
          },
          after: {
            senderBalanceMinor: debited.availableBalanceMinor,
            receiverBalanceMinor: credited.availableBalanceMinor,
            transferReference,
          },
          metadata,
          session,
        });

        return { transaction: sentTransaction, counterpart: receivedTransaction, duplicate: false };
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      },
    );
    return result;
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await findIdempotentResult(userId, idempotencyKey, fingerprint);
      if (duplicate) return { transaction: duplicate, duplicate: true };
    }
    throw error;
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listTransactions({ owner, filters, staff = false }) {
  const query = staff ? {} : { owner };
  if (filters.direction) query.direction = filters.direction;
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    if (filters.dateTo) query.createdAt.$lte = new Date(`${filters.dateTo}T23:59:59.999Z`);
  }
  if (filters.search) {
    const pattern = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [
      { reference: pattern },
      { transferReference: pattern },
      { description: pattern },
      { counterpartyAccountNumber: pattern },
    ];
  }

  const skip = (filters.page - 1) * filters.limit;
  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(filters.limit)
      .populate('owner', 'firstName lastName email'),
    Transaction.countDocuments(query),
  ]);

  return {
    transactions,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function getTransactionForUser(transactionId, user) {
  const query = { _id: transactionId };
  if (user.role === 'customer') query.owner = user._id;
  const transaction = await Transaction.findOne(query).populate(
    'owner',
    'firstName lastName email',
  );
  if (!transaction) throw new AppError('Transaction not found', 404);
  return transaction;
}
