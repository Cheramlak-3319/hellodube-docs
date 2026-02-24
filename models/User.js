// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },

    // Verification fields
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: Date,

    // Status & Role
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "suspended"],
      default: "pending",
    },
    role: {
      type: String,
      enum: ["dube-admin", "dube-viewer", "wfp-admin", "wfp-viewer", "pending"],
      default: "pending",
    },

    // Admin approval tracking
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    rejectionReason: String,

    // Activity tracking
    lastLogin: Date,
    loginCount: { type: Number, default: 0 },

    // Terms acceptance
    acceptedTerms: [String],
    termsAcceptedAt: Date,
  },
  { timestamps: true },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for user profile (excludes password)
userSchema.virtual("profile").get(function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    role: this.role,
    status: this.status,
    emailVerified: this.emailVerified,
  };
});

module.exports = mongoose.model("User", userSchema);
