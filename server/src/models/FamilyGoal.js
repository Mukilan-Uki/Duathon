import mongoose from 'mongoose';

const positiveMinor = {
  type: Number,
  required: true,
  min: 1,
  validate: { validator: Number.isSafeInteger, message: 'Amount must use integer minor units' },
};

const contributorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountMinor: positiveMinor,
    reference: { type: String, required: true },
    contributedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const familyGoalSchema = new mongoose.Schema(
  {
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyGroup',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    targetAmountMinor: positiveMinor,
    currentAmountMinor: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: { validator: Number.isSafeInteger, message: 'Amount must use integer minor units' },
    },
    currency: { type: String, enum: ['LKR'], default: 'LKR' },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'cancelled'],
      default: 'active',
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contributors: { type: [contributorSchema], default: [] },
  },
  { timestamps: true },
);

familyGoalSchema.index({ family: 1, status: 1, createdAt: -1 });

export default mongoose.model('FamilyGoal', familyGoalSchema);
