import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null },
    replacedByToken: { type: String, default: null, select: false },
    createdByIp: { type: String, default: '' },
    revokedByIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

export default mongoose.model('RefreshToken', refreshTokenSchema);
