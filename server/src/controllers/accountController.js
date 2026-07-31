import {
  applyForAccount,
  approveAccount,
  changeAccountStatus,
  getAuthorizedAccount,
  listCustomerAccounts,
  listPendingAccounts,
  rejectAccount,
  reviewAccount,
  searchAccounts,
} from '../services/accountService.js';
import { successResponse } from '../utils/apiResponse.js';

function metadata(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') || '' };
}

export async function createAccountApplication(req, res) {
  const account = await applyForAccount(req.user._id, req.body, metadata(req));
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

export async function approve(req, res) {
  const account = await approveAccount(req.params.accountId, req.user, metadata(req));
  return successResponse(res, { message: 'Account approved successfully', data: { account } });
}

export async function reject(req, res) {
  const account = await rejectAccount(
    req.params.accountId,
    req.user,
    req.body.reason,
    metadata(req),
  );
  return successResponse(res, { message: 'Account application rejected', data: { account } });
}

export async function search(req, res) {
  const accounts = await searchAccounts(req.query);
  return successResponse(res, { data: { accounts } });
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

export function suspend(req, res) {
  return handleStatus(req, res, 'suspended');
}

export function reactivate(req, res) {
  return handleStatus(req, res, 'active');
}

export function close(req, res) {
  return handleStatus(req, res, 'closed');
}

async function handleStatus(req, res, status) {
  const account = await changeAccountStatus(
    req.params.accountId,
    req.user,
    status,
    req.body.reason,
    metadata(req),
  );
  return successResponse(res, {
    message: `Account status changed to ${status}`,
    data: { account },
  });
}
