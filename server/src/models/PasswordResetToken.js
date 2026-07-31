import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date, default: null },
    createdByIp: { type: String, default: '' },
  },
  { timestamps: true },
);

passwordResetTokenSchema.index({ user: 1, usedAt: 1 });

export default mongoose.model('PasswordResetToken', passwordResetTokenSchema);
