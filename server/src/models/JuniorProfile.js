import mongoose from 'mongoose';

const limits = { type: Number, default: 0, min: 0, validate: Number.isSafeInteger };
const guardianSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    relationship: { type: String, trim: true, maxlength: 40 },
    permissions: {
      manageControls: { type: Boolean, default: false },
      manageAllowances: { type: Boolean, default: false },
      approveTransactions: { type: Boolean, default: false },
      viewTransactions: { type: Boolean, default: false },
      manageBeneficiaries: { type: Boolean, default: false },
    },
  },
  { _id: true },
);

const juniorProfileSchema = new mongoose.Schema(
  {
    juniorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyGroup',
      required: true,
      index: true,
    },
    primaryGuardian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    guardians: { type: [guardianSchema], required: true },
    dateOfBirth: { type: Date, required: true },
    relationshipToGuardian: { type: String, required: true, trim: true, maxlength: 40 },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'converted_to_adult', 'closed'],
      default: 'pending',
      index: true,
    },
    permissions: {
      canTransfer: { type: Boolean, default: true },
      canCreateSavingsGoals: { type: Boolean, default: true },
      canRequestBeneficiaries: { type: Boolean, default: false },
      canApplyForLoans: { type: Boolean, default: false },
    },
    spendingLimits: {
      perTransactionLimitMinor: limits,
      dailyLimitMinor: limits,
      weeklyLimitMinor: limits,
      monthlyLimitMinor: limits,
    },
    allowanceSettings: { enabled: { type: Boolean, default: true } },
    approvalSettings: {
      requireApprovalAboveMinor: limits,
      requireApprovalForNewBeneficiary: { type: Boolean, default: true },
      requireApprovalForExternalTransfer: { type: Boolean, default: true },
      blockCashWithdrawal: { type: Boolean, default: true },
      allowedTransactionTypes: {
        type: [String],
        enum: ['transfer', 'allowance', 'goal_contribution'],
        default: ['transfer', 'allowance', 'goal_contribution'],
      },
    },
  },
  { timestamps: true },
);

juniorProfileSchema.index({ family: 1, status: 1 });
export default mongoose.model('JuniorProfile', juniorProfileSchema);
