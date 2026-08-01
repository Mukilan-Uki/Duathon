import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/AppError.js';

const mocks = vi.hoisted(() => ({
  createFamily: vi.fn(),
  getFamily: vi.fn(),
  getMyFamily: vi.fn(),
  inviteAdult: vi.fn(),
  listMyInvitations: vi.fn(),
  respondToInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
  createGoal: vi.fn(),
  listGoals: vi.fn(),
  getGoal: vi.fn(),
  updateGoal: vi.fn(),
  cancelGoal: vi.fn(),
  contributeToGoal: vi.fn(),
  listFamilyInvitations: vi.fn(),
  getFamilyDashboard: vi.fn(),
  createAnnouncement: vi.fn(),
  listAnnouncements: vi.fn(),
}));

vi.mock('../services/familyService.js', () => mocks);
vi.mock('../middleware/authenticate.js', () => ({
  authenticate(req, _res, next) {
    req.user = {
      _id: '507f1f77bcf86cd799439011',
      role: req.get('x-test-role') || 'customer',
    };
    next();
  },
}));

const { default: app } = await import('../app.js');
const familyId = '507f1f77bcf86cd799439020';
const invitationId = '507f1f77bcf86cd799439021';
const memberId = '507f1f77bcf86cd799439022';
const goalId = '507f1f77bcf86cd799439023';

describe('Family Banking API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a family for a customer and rejects duplicate creation from the service', async () => {
    mocks.createFamily.mockResolvedValue({ _id: familyId, name: 'Silva Family' });
    await request(app).post('/api/families').send({ name: 'Silva Family' }).expect(201);
    mocks.createFamily.mockRejectedValueOnce(
      new AppError('You already belong to an active family', 409),
    );
    await request(app).post('/api/families').send({ name: 'Another Family' }).expect(409);
  });

  it('rejects non-customer access and invalid family identifiers', async () => {
    await request(app)
      .post('/api/families')
      .set('x-test-role', 'employee')
      .send({ name: 'Staff Family' })
      .expect(403);
    await request(app).get('/api/families/not-an-id').expect(422);
  });

  it('invites an adult without exposing account existence and prevents duplicate invitations', async () => {
    mocks.inviteAdult.mockResolvedValue(null);
    const payload = { email: 'member@example.com', relationship: 'sibling' };
    const response = await request(app)
      .post(`/api/families/${familyId}/invitations`)
      .send(payload)
      .expect(201);
    expect(response.body.message).toMatch(/if the customer is eligible/i);
    mocks.inviteAdult.mockRejectedValueOnce(
      new AppError('An active invitation already exists', 409),
    );
    await request(app).post(`/api/families/${familyId}/invitations`).send(payload).expect(409);
  });

  it.each(['accept', 'reject'])('%ss an owned invitation', async (decision) => {
    mocks.respondToInvitation.mockResolvedValue({ _id: invitationId, status: `${decision}ed` });
    await request(app).patch(`/api/families/invitations/${invitationId}/${decision}`).expect(200);
    expect(mocks.respondToInvitation).toHaveBeenCalledWith(
      invitationId,
      '507f1f77bcf86cd799439011',
      decision,
      expect.any(Object),
    );
  });

  it('updates explicit member permissions and preserves ownership enforcement in the service', async () => {
    mocks.updateMember.mockResolvedValue({ _id: familyId });
    await request(app)
      .patch(`/api/families/${familyId}/members/${memberId}/permissions`)
      .send({ viewSharedGoals: true, manageFamilyMembers: false })
      .expect(200);
    mocks.updateMember.mockRejectedValueOnce(
      new AppError('Family administrator permission required', 403),
    );
    await request(app)
      .patch(`/api/families/${familyId}/members/${memberId}/permissions`)
      .send({ viewSharedGoals: false })
      .expect(403);
  });

  it('soft-removes a family member through the authorized service boundary', async () => {
    await request(app).delete(`/api/families/${familyId}/members/${memberId}`).expect(200);
    expect(mocks.removeMember).toHaveBeenCalledOnce();
  });

  it('creates and lists shared savings goals', async () => {
    mocks.createGoal.mockResolvedValue({ _id: goalId, targetAmountMinor: 100000 });
    await request(app)
      .post(`/api/families/${familyId}/goals`)
      .send({ title: 'Family holiday', targetAmountMinor: 100000 })
      .expect(201);
    mocks.listGoals.mockResolvedValue([]);
    await request(app).get(`/api/families/${familyId}/goals`).expect(200);
  });

  it('requires idempotency and delegates goal contributions to the transactional service', async () => {
    const payload = { sourceAccountId: '507f1f77bcf86cd799439024', amountMinor: 5000 };
    await request(app)
      .post(`/api/families/${familyId}/goals/${goalId}/contribute`)
      .send(payload)
      .expect(400);
    mocks.contributeToGoal.mockResolvedValue({
      duplicate: false,
      contribution: { _id: 'contribution' },
    });
    await request(app)
      .post(`/api/families/${familyId}/goals/${goalId}/contribute`)
      .set('Idempotency-Key', 'family-goal-key-001')
      .send(payload)
      .expect(201);
    expect(mocks.contributeToGoal).toHaveBeenCalledWith(
      familyId,
      goalId,
      expect.objectContaining({ _id: '507f1f77bcf86cd799439011' }),
      payload,
      'family-goal-key-001',
      expect.any(Object),
    );
  });

  it('returns a service authorization failure for unauthorized goal contribution', async () => {
    mocks.contributeToGoal.mockRejectedValue(new AppError('Family permission required', 403));
    await request(app)
      .post(`/api/families/${familyId}/goals/${goalId}/contribute`)
      .set('Idempotency-Key', 'family-goal-key-002')
      .send({ sourceAccountId: '507f1f77bcf86cd799439024', amountMinor: 5000 })
      .expect(403);
  });

  it('returns the permission-filtered family dashboard', async () => {
    mocks.getFamilyDashboard.mockResolvedValue({ activeMembers: 2, pendingInvitations: 1 });
    const response = await request(app).get(`/api/families/${familyId}/dashboard`).expect(200);
    expect(response.body.data.activeMembers).toBe(2);
  });

  it('publishes a validated family announcement through the service boundary', async () => {
    mocks.createAnnouncement.mockResolvedValue({
      title: 'Family update',
      message: 'Holiday goal updated.',
    });
    await request(app)
      .post(`/api/families/${familyId}/announcements`)
      .send({ title: 'Family update', message: 'Holiday goal updated.' })
      .expect(201);
    expect(mocks.createAnnouncement).toHaveBeenCalledOnce();
  });
});
