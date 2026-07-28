import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
      immutable: true,
    },
    counterpartyAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
      immutable: true,
    },
    counterpartyOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      immutable: true,
    },
    reference: { type: String, required: true, unique: true, immutable: true },
    transferReference: { type: String, required: true, index: true, immutable: true },
    idempotencyKey: { type: String, select: false, immutable: true },
    requestHash: { type: String, select: false, immutable: true },
    type: {
      type: String,
      enum: ['transfer', 'deposit', 'withdrawal', 'loan_payment'],
      required: true,
      immutable: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['sent', 'received', 'credit', 'debit'],
      required: true,
      immutable: true,
      index: true,
    },
    amountMinor: {
      type: Number,
      required: true,
      min: 1,
      immutable: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Transaction amount must be an integer minor-unit value',
      },
    },
    currency: { type: String, enum: ['LKR'], default: 'LKR', immutable: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed', 'cancelled'],
      required: true,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 200, default: '', immutable: true },
    balanceAfterMinor: {
      type: Number,
      required: true,
      min: 0,
      immutable: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Balance snapshot must be an integer minor-unit value',
      },
    },
    counterpartyAccountNumber: { type: String, required: true, immutable: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, result) {
        delete result.idempotencyKey;
        delete result.requestHash;
        delete result.__v;
        return result;
      },
    },
  },
);

transactionSchema.index(
  { owner: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  },
);
transactionSchema.index({ owner: 1, createdAt: -1 });
transactionSchema.index({ account: 1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
