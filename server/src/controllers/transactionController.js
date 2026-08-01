import {
  getTransactionForUser,
  listTransactions,
  transferMoney,
  validateRecipient,
} from '../services/transactionService.js';
import { createAuditLog } from '../services/auditService.js';
import { successResponse } from '../utils/apiResponse.js';

function metadata(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') || '' };
}

export async function transfer(req, res) {
  const result = await transferMoney(req.user._id, req.body, req.idempotencyKey, metadata(req));
  return successResponse(res, {
    statusCode: result.duplicate ? 200 : 201,
    message: result.duplicate
      ? 'Transfer request already processed'
      : 'Transfer completed successfully',
    data: {
      transaction: result.transaction,
      duplicate: result.duplicate,
    },
  });
}

export async function recipient(req, res) {
  const recipientAccount = await validateRecipient(req.body.accountNumber);
  return successResponse(res, { data: { recipient: recipientAccount } });
}

export async function history(req, res) {
  const result = await listTransactions({
    owner: req.user._id,
    filters: req.query,
  });
  return successResponse(res, { data: result });
}

export async function monitor(req, res) {
  const result = await listTransactions({
    filters: req.query,
    staff: true,
  });
  return successResponse(res, { data: result });
}

export async function details(req, res) {
  const transaction = await getTransactionForUser(req.params.transactionId, req.user);
  if (req.user.role !== 'customer') {
    await createAuditLog({
      actor: req.user._id,
      action: 'TRANSACTION_VIEWED',
      targetType: 'Transaction',
      targetId: req.params.transactionId,
      before: null,
      after: null,
      metadata: metadata(req),
    });
  }
  return successResponse(res, { data: { transaction } });
}

export async function receipt(req, res) {
  const transaction = await getTransactionForUser(req.params.transactionId, req.user);
  await createAuditLog({
    actor: req.user._id,
    action: 'TRANSACTION_RECEIPT_ACCESSED',
    targetType: 'Transaction',
    targetId: req.params.transactionId,
    before: null,
    after: null,
    metadata: metadata(req),
  });
  return successResponse(res, {
    message: 'Receipt generated successfully',
    data: {
      receipt: {
        bank: 'Duothan Bank',
        transactionId: transaction._id,
        reference: transaction.reference,
        date: transaction.completedAt || transaction.initiatedAt,
        direction: transaction.direction,
        amount: transaction.amount,
        amountMinor: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        senderAccount: transaction.senderAccount,
        receiverAccount: transaction.receiverAccount,
        status: transaction.status,
      },
    },
  });
}
