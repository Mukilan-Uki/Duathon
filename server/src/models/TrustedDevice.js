import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceIdHash: { type: String, required: true, unique: true, select: false },
    deviceName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    browser: { type: String, maxlength: 60, default: 'Unknown' },
    operatingSystem: { type: String, maxlength: 60, default: 'Unknown' },
    userAgentSummary: { type: String, maxlength: 200, default: '' },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    lastLoginIp: { type: String, default: '' },
    trustedAt: { type: Date, default: null },
    trustedUntil: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ['pending', 'trusted', 'revoked', 'expired', 'blocked'],
      default: 'pending',
      index: true,
    },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, trim: true, maxlength: 200, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, value) {
        delete value.deviceIdHash;
        delete value.__v;
        return value;
      },
    },
  },
);
schema.index({ user: 1, status: 1, lastSeenAt: -1 });
export default mongoose.model('TrustedDevice', schema);
