import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    category: {
      type: String,
      enum: ['transactions', 'accounts', 'loans', 'security', 'notifications', 'application'],
      required: true,
      index: true,
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, required: true, maxlength: 300 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export default mongoose.model('SystemSetting', systemSettingSchema);
