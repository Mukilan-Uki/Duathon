import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    successful: { type: Boolean, required: true, index: true },
    reason: {
      type: String,
      enum: ['success', 'invalid_credentials', 'locked', 'suspended', 'unverified'],
      required: true,
    },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    browser: { type: String, default: 'Unknown' },
    operatingSystem: { type: String, default: 'Unknown' },
    device: { type: String, default: 'Unknown' },
    logoutAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('LoginHistory', loginHistorySchema);
