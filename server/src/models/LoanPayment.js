import mongoose from 'mongoose';

const loanPaymentSchema = new mongoose.Schema(
  {
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    reference: { type: String, required: true, unique: true, immutable: true },
    amountMinor: {
      type: Number,
      required: true,
      min: 1,
      immutable: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Payment amount must use integer minor units',
      },
    },
    outstandingAfterMinor: { type: Number, required: true, min: 0, immutable: true },
    status: {
      type: String,
      enum: ['completed', 'reversed'],
      default: 'completed',
      index: true,
    },
    idempotencyKey: { type: String, required: true, select: false, immutable: true },
    requestHash: { type: String, required: true, select: false, immutable: true },
  },
  { timestamps: true },
);

loanPaymentSchema.index({ borrower: 1, idempotencyKey: 1 }, { unique: true });

export default mongoose.model('LoanPayment', loanPaymentSchema);
