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
export async function executeAllowance(req, res) {
  const result = await service.executeAllowance(
    req.user,
    req.params.allowanceId,
    req.idempotencyKey,
    metadata(req),
  );
  return successResponse(res, {
    statusCode: result.duplicate ? 200 : 201,
    message: result.duplicate ? 'Allowance already processed' : 'Allowance sent',
    data: result,
  });
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
export async function requestBeneficiary(req, res) {
  const permission = await service.requestBeneficiary(req.user, req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Beneficiary approval requested',
    data: { permission },
  });
}
export async function approveBeneficiary(req, res) {
  const permission = await service.reviewBeneficiary(
    req.user,
    req.params.permissionId,
    'approved',
    req.body.reason,
  );
  return successResponse(res, { message: 'Junior beneficiary approved', data: { permission } });
}
export async function rejectBeneficiary(req, res) {
  const permission = await service.reviewBeneficiary(
    req.user,
    req.params.permissionId,
    'rejected',
    req.body.reason,
  );
  return successResponse(res, { message: 'Junior beneficiary rejected', data: { permission } });
}
export async function removeBeneficiary(req, res) {
  await service.removeBeneficiaryPermission(req.user, req.params.permissionId);
  return successResponse(res, { message: 'Junior beneficiary permission removed' });
}
export async function convert(req, res) {
  const profile = await service.convertToAdult(req.user, req.params.juniorId, metadata(req));
  return successResponse(res, { message: 'Junior profile converted to adult', data: { profile } });
}
export async function createGoal(req, res) {
  const goal = await service.createJuniorGoal(req.user, req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Junior savings goal created',
    data: { goal },
  });
}
export async function goals(req, res) {
  return successResponse(res, {
    data: { goals: await service.listJuniorGoals(req.user, req.params.juniorId) },
  });
}
export async function contributeGoal(req, res) {
  const result = await service.contributeJuniorGoal(
    req.user,
    req.params.goalId,
    req.body,
    req.idempotencyKey,
    metadata(req),
  );
  return successResponse(res, {
    statusCode: result.duplicate ? 200 : 201,
    message: result.duplicate ? 'Contribution already processed' : 'Goal contribution completed',
    data: result,
  });
}
export async function dashboard(req, res) {
  return successResponse(res, { data: await service.getJuniorDashboard(req.user) });
}
export async function guardianProfiles(req, res) {
  return successResponse(res, { data: { profiles: await service.listGuardianProfiles(req.user) } });
}
