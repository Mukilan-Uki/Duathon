import mongoose from 'mongoose';
const juniorAllowanceSchema = new mongoose.Schema(
  {
    juniorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JuniorProfile',
      required: true,
      index: true,
    },
    guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sourceAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    destinationAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    frequency: { type: String, enum: ['one_time', 'weekly', 'monthly'], required: true },
    nextRunAt: { type: Date, required: true, index: true },
    lastRunAt: Date,
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled', 'failed'],
      default: 'active',
      index: true,
    },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    lastIdempotencyKey: { type: String, select: false },
    failureReason: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true },
);
juniorAllowanceSchema.index({ status: 1, nextRunAt: 1 });
export default mongoose.model('JuniorAllowance', juniorAllowanceSchema);
