import mongoose from 'mongoose';

const beneficiarySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    beneficiaryAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      immutable: true,
    },
    beneficiaryAccountNumber: {
      type: String,
      required() {
        return this.isNew;
      },
      immutable: true,
      select: false,
    },
    // Compatibility path for beneficiary records created before Phase 5.
    accountNumber: { type: String, select: false, immutable: true },
    accountName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 121,
      immutable: true,
      select: false,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    relationship: {
      type: String,
      enum: ['family', 'friend', 'business', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
      index: true,
    },
    isFavourite: { type: Boolean, default: false, index: true },
    lastUsedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, result) {
        delete result.__v;
        delete result.beneficiaryAccountNumber;
        delete result.accountNumber;
        delete result.accountName;
        return result;
      },
    },
  },
);

beneficiarySchema.index({ owner: 1, beneficiaryAccount: 1 }, { unique: true });
beneficiarySchema.index({ owner: 1, nickname: 1 });
beneficiarySchema.index({ owner: 1, status: 1, isFavourite: 1 });
beneficiarySchema.index({ owner: 1, lastUsedAt: -1 });

beneficiarySchema.pre(
  ['deleteOne', 'deleteMany', 'findOneAndDelete'],
  function blockBeneficiaryDeletion() {
    throw new Error('Beneficiaries must be deactivated rather than deleted');
  },
);

export default mongoose.model('Beneficiary', beneficiarySchema);
