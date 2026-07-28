import mongoose from 'mongoose';

const integerMinor = {
  type: Number,
  required: true,
  min: 0,
  validate: {
    validator: Number.isSafeInteger,
    message: 'Loan money values must use integer minor units',
  },
};

const loanSchema = new mongoose.Schema(
  {
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanApplication',
      required: true,
      unique: true,
      immutable: true,
    },
    disbursementAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      immutable: true,
    },
    loanNumber: { type: String, required: true, unique: true, immutable: true },
    loanType: {
      type: String,
      enum: ['personal', 'education', 'home', 'business'],
      required: true,
      immutable: true,
    },
    principalMinor: { ...integerMinor, immutable: true },
    interestRateBps: { type: Number, required: true, min: 0, max: 10000, immutable: true },
    interestMinor: { ...integerMinor, immutable: true },
    totalRepayableMinor: { ...integerMinor, immutable: true },
    outstandingMinor: integerMinor,
    paidMinor: { ...integerMinor, default: 0 },
    monthlyInstallmentMinor: { ...integerMinor, immutable: true },
    repaymentMonths: { type: Number, required: true, min: 3, max: 360, immutable: true },
    status: {
      type: String,
      enum: ['active', 'paid', 'defaulted', 'written_off'],
      default: 'active',
      index: true,
    },
    disbursedAt: { type: Date, required: true, immutable: true },
    nextPaymentDueAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

loanSchema.index({ borrower: 1, status: 1, createdAt: -1 });

export default mongoose.model('Loan', loanSchema);
