import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['transaction', 'loan', 'security', 'account', 'announcement', 'operations'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 500 },
    targetType: { type: String, default: '' },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    readAt: { type: Date, default: null, index: true },
    deletedAt: { type: Date, default: null, index: true, select: false },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, deletedAt: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, deletedAt: 1, readAt: 1 });

export default mongoose.model('Notification', notificationSchema);
