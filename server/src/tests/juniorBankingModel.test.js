import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import JuniorAllowance from '../models/JuniorAllowance.js';
import JuniorProfile from '../models/JuniorProfile.js';
import JuniorTransactionRequest from '../models/JuniorTransactionRequest.js';
import JuniorSavingsGoal from '../models/JuniorSavingsGoal.js';

const oid = () => new mongoose.Types.ObjectId();
describe('Junior Banking models', () => {
  it('requires integer minor-unit limits', () => {
    const profile = new JuniorProfile({
      juniorUser: oid(),
      family: oid(),
      primaryGuardian: oid(),
      guardians: [{ user: oid() }],
      dateOfBirth: new Date('2012-01-01'),
      relationshipToGuardian: 'child',
      spendingLimits: { dailyLimitMinor: 12.5 },
    });
    expect(profile.validateSync().errors['spendingLimits.dailyLimitMinor']).toBeDefined();
  });
  it('validates allowance frequency and positive integer amount', () => {
    const allowance = new JuniorAllowance({
      juniorProfile: oid(),
      guardian: oid(),
      sourceAccount: oid(),
      destinationAccount: oid(),
      amountMinor: -1,
      frequency: 'daily',
      nextRunAt: new Date(),
    });
    expect(Object.keys(allowance.validateSync().errors)).toEqual(
      expect.arrayContaining(['amountMinor', 'frequency']),
    );
  });
  it('requires an expiring idempotent transaction request', () => {
    const request = new JuniorTransactionRequest({
      juniorProfile: oid(),
      juniorAccount: oid(),
      amountMinor: 1000,
      requestedBy: oid(),
    });
    expect(Object.keys(request.validateSync().errors)).toEqual(
      expect.arrayContaining(['expiresAt', 'idempotencyKey']),
    );
  });
  it('stores junior savings values in integer minor units', () => {
    const goal = new JuniorSavingsGoal({
      juniorProfile: oid(),
      title: 'New bicycle',
      targetAmountMinor: 1000.5,
      createdBy: oid(),
    });
    expect(goal.validateSync().errors.targetAmountMinor).toBeDefined();
  });
});
