import {
  getTransactionForUser,
  listTransactions,
  transferMoney,
} from '../services/transactionService.js';
import { successResponse } from '../utils/apiResponse.js';

function metadata(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') || '' };
}

export async function transfer(req, res) {
  const result = await transferMoney(req.user._id, req.body, req.idempotencyKey, metadata(req));
  return successResponse(res, {
    statusCode: result.duplicate ? 200 : 201,
    message: result.duplicate ? 'Transfer already completed' : 'Transfer completed successfully',
    data: {
      transaction: result.transaction,
      duplicate: result.duplicate,
    },
  });
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
  return successResponse(res, { data: { transaction } });
}

export async function receipt(req, res) {
  const transaction = await getTransactionForUser(req.params.transactionId, req.user);
  return successResponse(res, {
    message: 'Receipt generated successfully',
    data: {
      receipt: {
        bank: 'Duothan Bank',
        transactionId: transaction._id,
        reference: transaction.reference,
        transferReference: transaction.transferReference,
        date: transaction.createdAt,
        direction: transaction.direction,
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        description: transaction.description,
        counterpartyAccountNumber: transaction.counterpartyAccountNumber,
        status: transaction.status,
      },
    },
  });
}
