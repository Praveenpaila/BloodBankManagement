const mongoose = require("mongoose");

const loyaltyRecordSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  points: {
    type: Number,
    default: 0,
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("LoyaltyRecord", loyaltyRecordSchema);
