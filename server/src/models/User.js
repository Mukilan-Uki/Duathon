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
    password: { type: String, required: true, minlength: 12, select: false },
    phoneNumber: {
      type: String,
      required: true,
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

userSchema.virtual('status')
  .get(function getStatus() {
    return this.accountStatus;
  })
  .set(function setStatus(value) {
    this.accountStatus = value;
  });

userSchema.virtual('emailVerifiedAt').get(function getEmailVerifiedAt() {
  return this.isEmailVerified ? this.updatedAt : null;
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.verifyPassword = userSchema.methods.comparePassword;

userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

export default mongoose.model('User', userSchema);
