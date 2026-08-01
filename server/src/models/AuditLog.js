import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    requestMethod: { type: String, default: '', maxlength: 10 },
    outcome: { type: String, enum: ['success', 'failure'], default: 'success', index: true },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1, action: 1, targetType: 1 });

auditLogSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany'],
  function blockMutation() {
    throw new Error('Audit logs are immutable');
  },
);

export default mongoose.model('AuditLog', auditLogSchema);
