import * as service from '../services/juniorBankingService.js';
import { successResponse } from '../utils/apiResponse.js';
const metadata = (req) => ({
  ip: req.ip,
  userAgent: req.get('user-agent') || '',
  method: req.method,
});
export async function createProfile(req, res) {
  const profile = await service.createJuniorProfile(req.user, req.body, metadata(req));
  return successResponse(res, {
    statusCode: 201,
    message: 'Junior profile created',
    data: { profile },
  });
}
export async function createAccount(req, res) {
  const account = await service.createJuniorAccount(
    req.user,
    req.params.juniorId,
    req.body,
    metadata(req),
  );
  return successResponse(res, {
    statusCode: 201,
    message: 'Junior account created',
    data: { account },
  });
}
export async function getControls(req, res) {
  return successResponse(res, { data: await service.getControls(req.user, req.params.juniorId) });
}
export async function updateControls(req, res) {
  const profile = await service.updateControls(
    req.user,
    req.params.juniorId,
    req.body,
    metadata(req),
  );
  return successResponse(res, { message: 'Junior controls updated', data: { profile } });
}
export async function createAllowance(req, res) {
  const allowance = await service.createAllowance(req.user, req.params.juniorId, req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Allowance created',
    data: { allowance },
  });
}
export async function allowances(req, res) {
  return successResponse(res, {
    data: { allowances: await service.listAllowances(req.user, req.params.juniorId) },
  });
}
export async function pauseAllowance(req, res) {
  return successResponse(res, {
    message: 'Allowance paused',
    data: {
      allowance: await service.changeAllowance(req.user, req.params.allowanceId, {
        status: 'paused',
      }),
    },
  });
}
export async function resumeAllowance(req, res) {
  return successResponse(res, {
    message: 'Allowance resumed',
    data: {
      allowance: await service.changeAllowance(req.user, req.params.allowanceId, {
        status: 'active',
      }),
    },
  });
}
export async function cancelAllowance(req, res) {
  await service.changeAllowance(req.user, req.params.allowanceId, { status: 'cancelled' });
  return successResponse(res, { message: 'Allowance cancelled' });
}
export async function requestTransaction(req, res) {
  const request = await service.requestTransaction(req.user, req.body, req.idempotencyKey);
  return successResponse(res, {
    statusCode: 201,
    message: 'Transaction approval requested',
    data: { request },
  });
}
export async function myRequests(req, res) {
  return successResponse(res, { data: { requests: await service.myRequests(req.user) } });
}
export async function pending(req, res) {
  return successResponse(res, { data: { requests: await service.pendingApprovals(req.user) } });
}
export async function approve(req, res) {
  const request = await service.reviewRequest(
    req.user,
    req.params.requestId,
    'approve',
    req.body.reason,
    metadata(req),
  );
  return successResponse(res, {
    message: 'Transaction request approved for processing',
    data: { request },
  });
}
export async function reject(req, res) {
  const request = await service.reviewRequest(
    req.user,
    req.params.requestId,
    'reject',
    req.body.reason,
    metadata(req),
  );
  return successResponse(res, { message: 'Transaction request rejected', data: { request } });
}
export async function cancelRequest(req, res) {
  const request = await service.cancelRequest(req.user, req.params.requestId);
  return successResponse(res, { message: 'Transaction request cancelled', data: { request } });
}
