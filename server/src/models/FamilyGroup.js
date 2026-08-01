import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    viewSharedGoals: { type: Boolean, default: true },
    contributeToSharedGoals: { type: Boolean, default: true },
    manageJuniorAccounts: { type: Boolean, default: false },
    approveJuniorTransactions: { type: Boolean, default: false },
    viewJuniorTransactions: { type: Boolean, default: false },
    manageFamilyMembers: { type: Boolean, default: false },
    createFamilyAnnouncements: { type: Boolean, default: false },
  },
  { _id: false },
);

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['family_admin', 'adult_member', 'junior_member'],
      required: true,
    },
    relationship: { type: String, trim: true, minlength: 2, maxlength: 40, required: true },
    status: {
      type: String,
      enum: ['invited', 'pending', 'active', 'rejected', 'removed'],
      default: 'active',
    },
    permissions: { type: permissionSchema, default: () => ({}) },
    joinedAt: { type: Date, default: null },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const familyGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    familyCode: { type: String, required: true, unique: true, immutable: true, index: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    members: { type: [memberSchema], default: [] },
    status: {
      type: String,
      enum: ['active', 'suspended', 'archived'],
      default: 'active',
      index: true,
    },
    settings: {
      shareAdultBalances: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

familyGroupSchema.index({ 'members.user': 1, status: 1 });
familyGroupSchema.index({ createdBy: 1, status: 1 });

export default mongoose.model('FamilyGroup', familyGroupSchema);
