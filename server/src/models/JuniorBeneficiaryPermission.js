import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    juniorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JuniorProfile',
      required: true,
      index: true,
    },
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'blocked', 'removed'],
      default: 'pending',
      index: true,
    },
    reviewReason: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true },
);
schema.index({ juniorProfile: 1, beneficiary: 1 }, { unique: true });
export default mongoose.model('JuniorBeneficiaryPermission', schema);
