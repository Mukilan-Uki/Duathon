import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    successful: { type: Boolean, required: true, index: true },
    reason: {
      type: String,
      enum: [
        'success',
        'invalid_credentials',
        'locked',
        'suspended',
        'unverified',
        'device_revoked',
      ],
      required: true,
    },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    browser: { type: String, default: 'Unknown' },
    operatingSystem: { type: String, default: 'Unknown' },
    device: { type: String, default: 'Unknown' },
    logoutAt: { type: Date, default: null },
    trustedDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'TrustedDevice', default: null },
    deviceStatus: {
      type: String,
      enum: ['pending', 'trusted', 'revoked', 'expired', 'blocked', 'unknown'],
      default: 'unknown',
    },
    sessionId: { type: String, default: '' },
    loginMethod: { type: String, enum: ['password', 'refresh', 'otp'], default: 'password' },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    riskReasons: {
      type: [String],
      enum: [
        'new_device',
        'failed_attempts',
        'changed_ip',
        'impossible_travel_placeholder',
        'revoked_device',
        'unusual_login_time',
        'repeated_otp_failure',
      ],
      default: [],
    },
    loggedOutAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('LoginHistory', loginHistorySchema);
