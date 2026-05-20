const mongoose = require("mongoose");

const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const donationHistorySchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: bloodGroups,
      required: true,
    },
    units: {
      type: Number,
      default: 1,
    },
    donationDate: {
      type: Date,
      default: Date.now,
    },
    certificateId: {
      type: String,
      unique: true,
      required: true,
    },
    notes: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("DonationHistory", donationHistorySchema);
