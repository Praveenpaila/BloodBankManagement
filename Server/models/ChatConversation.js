const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
);

const chatConversationSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BloodRequest",
      required: true,
      unique: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: [chatMessageSchema],
  },
  { timestamps: true },
);

chatConversationSchema.index({ hospital: 1, donor: 1 });

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
