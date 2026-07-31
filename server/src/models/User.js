import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required() {
        return !this.passwordHash;
      },
      minlength: 12,
      select: false,
    },
    // Temporary read-only compatibility path for records created before Phase 2.
    passwordHash: { type: String, select: false },
    phoneNumber: {
      type: String,
      required() {
        // Legacy users predate phone capture; all newly created users must provide it.
        return this.isNew;
      },
      trim: true,
      match: [/^\+?[1-9]\d{7,14}$/, 'Please provide a valid phone number'],
    },
    role: {
      type: String,
      enum: ['customer', 'employee', 'admin'],
      default: 'customer',
      index: true,
    },
    accountStatus: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'pending',
      index: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    // Temporary compatibility paths for pre-Phase-2 records.
    status: { type: String, enum: ['pending', 'active', 'suspended'] },
    emailVerifiedAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
    passwordChangedAt: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    notificationPreferences: {
      transaction: { type: Boolean, default: true },
      loan: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
      account: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_document, result) {
        delete result.password;
        delete result.passwordHash;
        delete result.status;
        delete result.emailVerifiedAt;
        delete result.failedLoginAttempts;
        delete result.lockUntil;
        delete result.passwordChangedAt;
        delete result.__v;
        return result;
      },
    },
  },
);

userSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  const storedHash = this.password || this.passwordHash;
  if (!storedHash) return Promise.resolve(false);
  return bcrypt.compare(candidatePassword, storedHash);
};

userSchema.methods.verifyPassword = userSchema.methods.comparePassword;

userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

export default mongoose.model('User', userSchema);
