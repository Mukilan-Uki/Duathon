import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import User from '../models/User.js';

const baseUser = {
  firstName: 'Legacy',
  lastName: 'Customer',
  email: 'legacy@example.com',
  phoneNumber: '+94771234567',
};

describe('User password compatibility', () => {
  it('compares a legacy passwordHash without throwing', async () => {
    const passwordHash = await bcrypt.hash('StrongPass!123', 4);
    const user = new User({ ...baseUser, passwordHash });
    await expect(user.comparePassword('StrongPass!123')).resolves.toBe(true);
  });

  it('loads legacy activation fields for first-login migration', () => {
    const user = new User({
      ...baseUser,
      passwordHash: 'legacy-hash',
      status: 'active',
      emailVerifiedAt: new Date(),
    });
    expect(user.status).toBe('active');
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it('allows an existing legacy user without a phone number to save login metadata', async () => {
    const user = User.hydrate({
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Legacy',
      lastName: 'Customer',
      email: 'legacy@example.com',
      password: 'already-hashed-password',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    user.lastLoginAt = new Date();
    await expect(user.validate()).resolves.toBeUndefined();
  });

  it('still requires a phone number for newly registered users', () => {
    const user = new User({
      firstName: 'New',
      lastName: 'Customer',
      email: 'new@example.com',
      password: 'StrongPass!123',
    });
    expect(user.validateSync().errors.phoneNumber).toBeDefined();
  });

  it('returns false when a corrupt record has no stored password hash', async () => {
    const user = new User(baseUser);
    await expect(user.comparePassword('StrongPass!123')).resolves.toBe(false);
  });
});
