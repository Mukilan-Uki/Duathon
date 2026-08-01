import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import Beneficiary from '../models/Beneficiary.js';

function makeBeneficiary(overrides = {}) {
  return new Beneficiary({
    owner: new mongoose.Types.ObjectId(),
    beneficiaryAccount: new mongoose.Types.ObjectId(),
    beneficiaryAccountNumber: '609876543210',
    nickname: 'Nimal',
    relationship: 'friend',
    ...overrides,
  });
}

describe('Beneficiary model', () => {
  it('defines the Phase 5 lifecycle and safe account snapshot fields', () => {
    const schema = Beneficiary.schema;

    expect(schema.path('owner').options.ref).toBe('User');
    expect(schema.path('beneficiaryAccount').options.ref).toBe('Account');
    expect(schema.path('beneficiaryAccountNumber').options.select).toBe(false);
    expect(schema.path('beneficiaryAccountNumber').options.immutable).toBe(true);
    expect(schema.path('relationship').enumValues).toEqual([
      'family',
      'friend',
      'business',
      'other',
    ]);
    expect(schema.path('status').enumValues).toEqual(['active', 'inactive', 'blocked']);
    expect(schema.path('lastUsedAt')).toBeDefined();
    expect(schema.options.timestamps).toBe(true);
  });

  it('enforces a unique owner and beneficiary-account compound index', () => {
    const compound = Beneficiary.schema
      .indexes()
      .find(([fields]) => fields.owner === 1 && fields.beneficiaryAccount === 1);

    expect(compound).toBeDefined();
    expect(compound[1].unique).toBe(true);
  });

  it('applies safe lifecycle defaults and validates allowed values', async () => {
    const beneficiary = makeBeneficiary();

    await expect(beneficiary.validate()).resolves.toBeUndefined();
    expect(beneficiary.status).toBe('active');
    expect(beneficiary.isFavourite).toBe(false);
    expect(beneficiary.lastUsedAt).toBeNull();

    beneficiary.status = 'deleted';
    await expect(beneficiary.validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('keeps pre-Phase-5 records valid while applying lifecycle defaults in memory', async () => {
    const legacyBeneficiary = Beneficiary.hydrate({
      _id: new mongoose.Types.ObjectId(),
      owner: new mongoose.Types.ObjectId(),
      beneficiaryAccount: new mongoose.Types.ObjectId(),
      accountNumber: '609876543210',
      nickname: 'Legacy payee',
    });

    await expect(legacyBeneficiary.validate()).resolves.toBeUndefined();
    expect(legacyBeneficiary.isNew).toBe(false);
    expect(legacyBeneficiary.beneficiaryAccountNumber).toBeUndefined();
    expect(legacyBeneficiary.status).toBe('active');
    expect(legacyBeneficiary.isFavourite).toBe(false);
  });

  it('redacts full account snapshots and legacy holder details from JSON', () => {
    const beneficiary = makeBeneficiary({
      accountNumber: '609876543210',
      accountName: 'Nimal Perera',
    });

    const serialized = beneficiary.toJSON();
    expect(serialized).not.toHaveProperty('beneficiaryAccountNumber');
    expect(serialized).not.toHaveProperty('accountNumber');
    expect(serialized).not.toHaveProperty('accountName');
    expect(serialized).not.toHaveProperty('__v');
  });

  it('blocks physical deletion through model query operations', async () => {
    await expect(Beneficiary.deleteOne({ _id: new mongoose.Types.ObjectId() })).rejects.toThrow(
      'Beneficiaries must be deactivated rather than deleted',
    );
  });
});
