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
    accountNumber: {
      type: String,
      required: true,
      immutable: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 121,
      immutable: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
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

beneficiarySchema.index({ owner: 1, beneficiaryAccount: 1 }, { unique: true });
beneficiarySchema.index({ owner: 1, nickname: 1 });

export default mongoose.model('Beneficiary', beneficiarySchema);
