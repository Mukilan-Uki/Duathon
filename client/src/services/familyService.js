import httpClient from '../api/httpClient';

const data = (response) => response.data;

export const familyService = {
  create: (name) => httpClient.post('/families', { name }).then(data),
  mine: () => httpClient.get('/families/my').then(data),
  get: (familyId) => httpClient.get(`/families/${familyId}`).then(data),
  dashboard: (familyId) => httpClient.get(`/families/${familyId}/dashboard`).then(data),
  invite: (familyId, payload) =>
    httpClient.post(`/families/${familyId}/invitations`, payload).then(data),
  myInvitations: () => httpClient.get('/families/invitations/my').then(data),
  familyInvitations: (familyId) => httpClient.get(`/families/${familyId}/invitations`).then(data),
  respond: (invitationId, decision) =>
    httpClient.patch(`/families/invitations/${invitationId}/${decision}`).then(data),
  cancelInvitation: (invitationId) =>
    httpClient.patch(`/families/invitations/${invitationId}/cancel`).then(data),
  updatePermissions: (familyId, memberId, permissions) =>
    httpClient
      .patch(`/families/${familyId}/members/${memberId}/permissions`, permissions)
      .then(data),
  updateRole: (familyId, memberId, role) =>
    httpClient.patch(`/families/${familyId}/members/${memberId}/role`, { role }).then(data),
  removeMember: (familyId, memberId) =>
    httpClient.delete(`/families/${familyId}/members/${memberId}`).then(data),
  goals: (familyId) => httpClient.get(`/families/${familyId}/goals`).then(data),
  createGoal: (familyId, payload) =>
    httpClient.post(`/families/${familyId}/goals`, payload).then(data),
  updateGoal: (familyId, goalId, payload) =>
    httpClient.patch(`/families/${familyId}/goals/${goalId}`, payload).then(data),
  cancelGoal: (familyId, goalId) =>
    httpClient.patch(`/families/${familyId}/goals/${goalId}/cancel`).then(data),
  contribute: (familyId, goalId, payload, idempotencyKey) =>
    httpClient
      .post(`/families/${familyId}/goals/${goalId}/contribute`, payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then(data),
  announcements: (familyId) => httpClient.get(`/families/${familyId}/announcements`).then(data),
  announce: (familyId, payload) =>
    httpClient.post(`/families/${familyId}/announcements`, payload).then(data),
};
