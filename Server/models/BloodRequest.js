const mongoose = require("mongoose");

const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const bloodRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: bloodGroups,
      required: true,
    },
    unitsNeeded: {
      type: Number,
      required: true,
      min: 1,
    },
    urgency: {
      type: String,
      enum: ["normal", "urgent", "critical"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["open", "responding", "fulfilled", "cancelled"],
      default: "open",
    },
    notes: String,
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    radiusKm: {
      type: Number,
      default: 10,
    },
    notifiedDonors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    respondingDonors: [
      {
        donor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        action: {
          type: String,
          enum: ["accept", "decline"],
        },
        respondedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    fulfilledAt: Date,
  },
  { timestamps: true },
);

bloodRequestSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);
