import mongoose from 'mongoose';

const familyGoalContributionSchema = new mongoose.Schema(
  {
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyGroup',
      required: true,
      index: true,
    },
    goal: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyGoal', required: true, index: true },
    contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    amountMinor: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isSafeInteger, message: 'Amount must use integer minor units' },
    },
    reference: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, required: true, select: false },
    requestHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

familyGoalContributionSchema.index({ contributor: 1, idempotencyKey: 1 }, { unique: true });

export default mongoose.model('FamilyGoalContribution', familyGoalContributionSchema);
