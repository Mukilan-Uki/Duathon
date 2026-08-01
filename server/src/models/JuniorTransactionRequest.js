import mongoose from 'mongoose';
const juniorTransactionRequestSchema = new mongoose.Schema(
  {
    juniorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JuniorProfile',
      required: true,
      index: true,
    },
    juniorAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    receiverAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
    amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewReason: { type: String, trim: true, maxlength: 300, default: '' },
    expiresAt: { type: Date, required: true, index: true },
    idempotencyKey: { type: String, required: true },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  },
  { timestamps: true },
);
juniorTransactionRequestSchema.index({ juniorProfile: 1, idempotencyKey: 1 }, { unique: true });
juniorTransactionRequestSchema.index({ status: 1, expiresAt: 1 });
export default mongoose.model('JuniorTransactionRequest', juniorTransactionRequestSchema);
