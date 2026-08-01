import mongoose from 'mongoose';

const familyInvitationSchema = new mongoose.Schema(
  {
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyGroup',
      required: true,
      index: true,
    },
    invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['adult_member'], required: true },
    relationship: { type: String, trim: true, minlength: 2, maxlength: 40, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

familyInvitationSchema.index(
  { family: 1, invitedUser: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

export default mongoose.model('FamilyInvitation', familyInvitationSchema);
