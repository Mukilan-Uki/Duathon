import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accountNumber: {
      type: String,
      default: null,
      unique: true,
      select: false,
      sparse: true,
    },
    accountType: {
      type: String,
      enum: ['savings', 'current'],
      required: true,
    },
    isJuniorRestricted: { type: Boolean, default: false, index: true },
    currency: {
      type: String,
      enum: ['LKR'],
      default: 'LKR',
      immutable: true,
    },
    ledgerBalanceMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Ledger balance must be an integer minor-unit value',
      },
    },
    availableBalanceMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Available balance must be an integer minor-unit value',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'closed'],
      default: 'pending',
      index: true,
    },
    branchCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9]{3,10}$/, 'Branch code must contain 3 to 10 letters or digits'],
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
    suspendedAt: { type: Date, default: null },
    suspensionReason: { type: String, trim: true, maxlength: 500, default: '' },
    closedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, result) {
        delete result.__v;
        return result;
      },
    },
  },
);

accountSchema.index(
  { owner: 1, accountType: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);
accountSchema.index({ status: 1, createdAt: 1 });
accountSchema.index({ branchCode: 1, status: 1 });

accountSchema.virtual('user').get(function getUser() {
  return this.owner;
});
accountSchema.virtual('balance').get(function getBalance() {
  return this.ledgerBalanceMinor;
});
accountSchema.virtual('availableBalance').get(function getAvailableBalance() {
  return this.availableBalanceMinor;
});

export default mongoose.model('Account', accountSchema);
