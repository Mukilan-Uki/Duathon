import {
  applyForAccount,
  changeAccountStatus,
  getAuthorizedAccount,
  listCustomerAccounts,
  listPendingAccounts,
  reviewAccount,
} from '../services/accountService.js';
import { successResponse } from '../utils/apiResponse.js';

function metadata(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') || '' };
}

export async function createAccountApplication(req, res) {
  const account = await applyForAccount(req.user._id, req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Account application submitted for review',
    data: { account },
  });
}

export async function getMyAccounts(req, res) {
  const accounts = await listCustomerAccounts(req.user._id);
  return successResponse(res, { data: { accounts } });
}

export async function getAccount(req, res) {
  const account = await getAuthorizedAccount(req.params.accountId, req.user);
  return successResponse(res, { data: { account } });
}

export async function getPendingAccounts(_req, res) {
  const accounts = await listPendingAccounts();
  return successResponse(res, { data: { accounts } });
}

export async function review(req, res) {
  const account = await reviewAccount(
    req.params.accountId,
    req.user,
    req.body.decision,
    req.body.reviewNote,
    metadata(req),
  );
  return successResponse(res, {
    message: `Account ${req.body.decision === 'approve' ? 'approved' : 'rejected'} successfully`,
    data: { account },
  });
}

export async function updateStatus(req, res) {
  const account = await changeAccountStatus(
    req.params.accountId,
    req.user,
    req.body.status,
    req.body.note,
    metadata(req),
  );
  return successResponse(res, {
    message: `Account status changed to ${req.body.status}`,
    data: { account },
  });
}
