const mongoose = require("mongoose");

const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    dob: Date,
    bloodGroup: {
      type: String,
      enum: bloodGroups,
    },
    password: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "male", "female", "other"],
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    address: String,
    emergencyContact: String,
    age: Number,
    registrationNumber: String,
    role: {
      type: String,
      enum: ["donor", "hospital", "organization", "admin"],
      default: "donor",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isEligible: {
      type: Boolean,
      default: false,
    },
    points: {
      type: Number,
      default: 0,
    },
    totalDonations: {
      type: Number,
      default: 0,
    },
    badges: {
      type: [String],
      default: [],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    profilePhoto: String,
  },
  {
    timestamps: true,
  },
);

userSchema.pre("validate", function removeEmptyLocation() {
  if (this.location && !this.location.coordinates?.length) {
    this.location = undefined;
  }
});

userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
module.exports.bloodGroups = bloodGroups;
