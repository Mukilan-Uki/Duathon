import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import TrustedDevice from '../models/TrustedDevice.js';
describe('TrustedDevice model', () => {
  it('requires a hash and validates trusted-device status', () => {
    const device = new TrustedDevice({
      user: new mongoose.Types.ObjectId(),
      deviceName: 'Laptop',
      status: 'invalid',
    });
    const errors = device.validateSync().errors;
    expect(errors.deviceIdHash).toBeDefined();
    expect(errors.status).toBeDefined();
  });
  it('does not expose the device hash in JSON', () => {
    const device = new TrustedDevice({
      user: new mongoose.Types.ObjectId(),
      deviceIdHash: 'a'.repeat(64),
      deviceName: 'Laptop',
    });
    expect(device.toJSON().deviceIdHash).toBeUndefined();
  });
});
