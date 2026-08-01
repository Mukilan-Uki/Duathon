import {
  cancelGoal,
  cancelInvitation,
  contributeToGoal,
  createFamily,
  createGoal,
  getFamily,
  getGoal,
  getMyFamily,
  inviteAdult,
  listGoals,
  listMyInvitations,
  removeMember,
  respondToInvitation,
  updateGoal,
  updateMember,
} from '../services/familyService.js';
import { successResponse } from '../utils/apiResponse.js';

const metadata = (req) => ({
  ip: req.ip,
  userAgent: req.get('user-agent') || '',
  method: req.method,
});

export async function create(req, res) {
  const family = await createFamily(req.user._id, req.body.name, metadata(req));
  return successResponse(res, { statusCode: 201, message: 'Family created', data: { family } });
}
export async function mine(req, res) {
  return successResponse(res, { data: { family: await getMyFamily(req.user._id) } });
}
export async function details(req, res) {
  return successResponse(res, {
    data: { family: await getFamily(req.params.familyId, req.user._id) },
  });
}
export async function members(req, res) {
  const family = await getFamily(req.params.familyId, req.user._id);
  return successResponse(res, { data: { members: family.members } });
}
export async function invite(req, res) {
  await inviteAdult(req.params.familyId, req.user, req.body, metadata(req));
  return successResponse(res, {
    statusCode: 201,
    message: 'If the customer is eligible, the invitation has been sent',
  });
}
export async function myInvitations(req, res) {
  return successResponse(res, {
    data: { invitations: await listMyInvitations(req.user._id) },
  });
}
export async function accept(req, res) {
  const invitation = await respondToInvitation(
    req.params.invitationId,
    req.user._id,
    'accept',
    metadata(req),
  );
  return successResponse(res, { message: 'Family invitation accepted', data: { invitation } });
}
export async function reject(req, res) {
  const invitation = await respondToInvitation(
    req.params.invitationId,
    req.user._id,
    'reject',
    metadata(req),
  );
  return successResponse(res, { message: 'Family invitation rejected', data: { invitation } });
}
export async function cancelInvite(req, res) {
  await cancelInvitation(req.params.invitationId, req.user, metadata(req));
  return successResponse(res, { message: 'Family invitation cancelled' });
}
export async function changePermissions(req, res) {
  const family = await updateMember(
    req.params.familyId,
    req.params.memberId,
    req.user,
    { permissions: req.body },
    metadata(req),
  );
  return successResponse(res, { message: 'Member permissions updated', data: { family } });
}
export async function changeRole(req, res) {
  const family = await updateMember(
    req.params.familyId,
    req.params.memberId,
    req.user,
    { role: req.body.role },
    metadata(req),
  );
  return successResponse(res, { message: 'Member role updated', data: { family } });
}
export async function remove(req, res) {
  await removeMember(req.params.familyId, req.params.memberId, req.user, metadata(req));
  return successResponse(res, { message: 'Family member removed' });
}
export async function addGoal(req, res) {
  const goal = await createGoal(req.params.familyId, req.user, req.body, metadata(req));
  return successResponse(res, { statusCode: 201, message: 'Family goal created', data: { goal } });
}
export async function goals(req, res) {
  return successResponse(res, {
    data: { goals: await listGoals(req.params.familyId, req.user._id) },
  });
}
export async function goal(req, res) {
  return successResponse(res, {
    data: { goal: await getGoal(req.params.familyId, req.params.goalId, req.user._id) },
  });
}
export async function editGoal(req, res) {
  const goalResult = await updateGoal(
    req.params.familyId,
    req.params.goalId,
    req.user,
    req.body,
    metadata(req),
  );
  return successResponse(res, { message: 'Family goal updated', data: { goal: goalResult } });
}
export async function stopGoal(req, res) {
  const goalResult = await cancelGoal(
    req.params.familyId,
    req.params.goalId,
    req.user,
    metadata(req),
  );
  return successResponse(res, { message: 'Family goal cancelled', data: { goal: goalResult } });
}
export async function contribute(req, res) {
  const result = await contributeToGoal(
    req.params.familyId,
    req.params.goalId,
    req.user,
    req.body,
    req.idempotencyKey,
    metadata(req),
  );
  return successResponse(res, {
    statusCode: result.duplicate ? 200 : 201,
    message: result.duplicate ? 'Contribution already completed' : 'Contribution completed',
    data: result,
  });
}
