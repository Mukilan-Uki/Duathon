import mongoose from 'mongoose';
const integerAmount = { type: Number, required: true, min: 0, validate: Number.isSafeInteger };
const schema = new mongoose.Schema(
  {
    juniorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JuniorProfile',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    targetAmountMinor: { ...integerAmount, min: 1 },
    currentAmountMinor: { ...integerAmount, default: 0 },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contributions: [
      {
        contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        amountMinor: integerAmount,
        transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
        contributedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);
schema.index({ juniorProfile: 1, status: 1 });
export default mongoose.model('JuniorSavingsGoal', schema);
