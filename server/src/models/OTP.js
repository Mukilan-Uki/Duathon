import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0, select: false },
    maxAttempts: { type: Number, default: 5, select: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date, default: null },
    resendCount: { type: Number, default: 0, select: false },
    resendWindowStartedAt: { type: Date, default: Date.now, select: false },
  },
  { timestamps: true },
);

otpSchema.index({ user: 1, purpose: 1, consumedAt: 1 });

export default mongoose.model('OTP', otpSchema);
