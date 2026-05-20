const mongoose = require("mongoose");

const eligibilityRecordSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  age: Number,
  weight: Number,
  recentIllness: Boolean,
  medications: Boolean,
  travelHistory: Boolean,
  tattooPiercing: Boolean,
  hemoglobin: Number,
  gender: String,
  status: {
    type: String,
    enum: ["eligible", "temporarily_deferred", "permanently_deferred"],
    required: true,
  },
  deferralReason: String,
  deferralUntil: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("EligibilityRecord", eligibilityRecordSchema);
