import mongoose from 'mongoose';

const familyAnnouncementSchema = new mongoose.Schema(
  {
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyGroup', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    message: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  },
  { timestamps: true },
);

familyAnnouncementSchema.index({ family: 1, status: 1, createdAt: -1 });

export default mongoose.model('FamilyAnnouncement', familyAnnouncementSchema);
