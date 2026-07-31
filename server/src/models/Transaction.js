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
    senderUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    receiverUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    senderAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true },
    receiverAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true },
    senderAccountNumber: { type: String, select: false },
    receiverAccountNumber: { type: String, select: false },
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
      enum: [
        'transfer',
        'deposit',
        'withdrawal',
        'loan_payment',
        'loan_disbursement',
        'loan_repayment',
        'reversal',
      ],
      required: true,
      immutable: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: [
        'transfer',
        'deposit',
        'withdrawal',
        'loan_disbursement',
        'loan_repayment',
        'reversal',
      ],
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
    amount: {
      type: Number,
      min: 1,
      validate: {
        validator: (value) => value == null || Number.isSafeInteger(value),
        message: 'Transaction amount must be an integer minor-unit value',
      },
    },
    currency: { type: String, enum: ['LKR'], default: 'LKR', immutable: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'],
      required: true,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 200, default: '', immutable: true },
    failureReason: { type: String, trim: true, maxlength: 300, default: '' },
    initiatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    reversedAt: { type: Date, default: null },
    metadata: {
      type: new mongoose.Schema(
        {
          ipAddress: { type: String, default: '' },
          userAgent: { type: String, default: '', maxlength: 300 },
        },
        { _id: false },
      ),
      default: () => ({}),
      select: false,
    },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    balanceAfterMinor: {
      type: Number,
      required: true,
      min: 0,
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
transactionSchema.index({ senderUser: 1, initiatedAt: -1 });
transactionSchema.index({ receiverUser: 1, initiatedAt: -1 });
transactionSchema.index({ senderUser: 1, idempotencyKey: 1 }, { sparse: true });

transactionSchema.pre(
  ['deleteOne', 'deleteMany', 'findOneAndDelete', 'findByIdAndDelete'],
  function blockTransactionDeletion() {
    throw new Error('Financial transactions cannot be deleted');
  },
);

export default mongoose.model('Transaction', transactionSchema);
