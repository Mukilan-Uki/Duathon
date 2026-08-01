import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import FamilyGoal from '../models/FamilyGoal.js';
import FamilyGroup from '../models/FamilyGroup.js';
import FamilyInvitation from '../models/FamilyInvitation.js';

describe('Family Banking models', () => {
  it('creates an active family with explicit permission defaults', async () => {
    const userId = new mongoose.Types.ObjectId();
    const family = new FamilyGroup({
      name: 'Perera Family',
      familyCode: 'FAM-A1B2C3D4',
      createdBy: userId,
      members: [{ user: userId, role: 'family_admin', relationship: 'creator' }],
    });
    await expect(family.validate()).resolves.toBeUndefined();
    expect(family.status).toBe('active');
    expect(family.members[0].permissions.viewSharedGoals).toBe(true);
    expect(family.members[0].permissions.manageFamilyMembers).toBe(false);
  });

  it('defines a unique pending invitation boundary', () => {
    const index = FamilyInvitation.schema
      .indexes()
      .find(([fields]) => fields.family && fields.invitedUser && fields.status);
    expect(index?.[1]).toMatchObject({
      unique: true,
      partialFilterExpression: { status: 'pending' },
    });
  });

  it('stores family goal money as validated integer minor units', async () => {
    const goal = new FamilyGoal({
      family: new mongoose.Types.ObjectId(),
      title: 'Education fund',
      targetAmountMinor: 100000,
      currentAmountMinor: 5000.5,
      createdBy: new mongoose.Types.ObjectId(),
    });
    expect(goal.validateSync()?.errors.currentAmountMinor).toBeDefined();
  });
});
