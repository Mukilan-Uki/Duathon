import mongoose from 'mongoose';

const loanApplicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    disbursementAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      immutable: true,
    },
    loanType: {
      type: String,
      enum: ['personal', 'education', 'home', 'business'],
      required: true,
      immutable: true,
      index: true,
    },
    requestedAmountMinor: {
      type: Number,
      required: true,
      min: 1,
      immutable: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Requested amount must be an integer minor-unit value',
      },
    },
    purpose: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
    repaymentMonths: { type: Number, required: true, min: 3, max: 360, immutable: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
    approvedLoan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', default: null },
  },
  { timestamps: true },
);

loanApplicationSchema.index({ applicant: 1, createdAt: -1 });

export default mongoose.model('LoanApplication', loanApplicationSchema);
