import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const suspiciousActivitySchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      enum: ['transaction', 'login', 'otp', 'password_reset', 'transfer_attempts'],
      default: 'transaction',
      index: true,
    },
    reason: { type: String, required: true, maxlength: 500 },
    source: { type: String, enum: ['automatic', 'manual'], required: true },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
    flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: [noteSchema], default: [] },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

suspiciousActivitySchema.index({ customer: 1, category: 1, status: 1, createdAt: -1 });

export default mongoose.model('SuspiciousActivity', suspiciousActivitySchema);
