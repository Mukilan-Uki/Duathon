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
      required: true,
      unique: true,
      immutable: true,
      select: false,
    },
    accountType: {
      type: String,
      enum: ['savings', 'current'],
      required: true,
    },
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
    applicationNote: { type: String, trim: true, maxlength: 500, default: '' },
    reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    activatedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
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

accountSchema.index({ owner: 1, accountType: 1 }, { unique: true });

export default mongoose.model('Account', accountSchema);
