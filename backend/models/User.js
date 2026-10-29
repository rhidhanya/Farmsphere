const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [
        function () {
          return !this.phone && !this.phoneVerified;
        },
        'Email is required',
      ],
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId && !this.phoneVerified;
        },
        'Password is required',
      ],
      select: false,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ['FARMER', 'FPO_ADMIN'],
        message: '{VALUE} is not a valid role. Only FARMER and FPO_ADMIN are allowed.',
      },
      default: 'FARMER',
      required: true,
    },
    fpoName: {
      type: String,
      trim: true,
    },
    fpoRegistrationNo: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String, trim: true },
      village: { type: String, trim: true },
      district: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    kycVerified: {
      type: Boolean,
      default: false,
    },
    kycStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    kycRejectionReason: {
      type: String,
      trim: true,
    },
    kycReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    kycReviewedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
    },
    // New profile fields
    dob: { type: Date },
    age: { type: Number },
    // Aadhaar stored encrypted, excluded from queries by default
    aadhaar: { type: String, select: false },
    // Notification preferences
    notificationPreferences: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
