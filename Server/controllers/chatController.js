const ChatConversation = require("../models/ChatConversation");
const BloodRequest = require("../models/BloodRequest");
const { emitToRequest, emitToUser } = require("../utils/realtime");

const canAccess = (conversation, userId) =>
  String(conversation.hospital?._id || conversation.hospital) === String(userId) ||
  String(conversation.donor?._id || conversation.donor) === String(userId);

exports.getMyConversations = async (req, res) => {
  try {
    const conversations = await ChatConversation.find({
      $or: [{ hospital: req.user._id }, { donor: req.user._id }],
    })
      .populate("request", "bloodGroup unitsNeeded urgency status")
      .populate("hospital", "firstName lastName role phoneNumber")
      .populate("donor", "firstName lastName role phoneNumber bloodGroup")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching conversations",
    });
  }
};

exports.getConversationByRequest = async (req, res) => {
  try {
    const conversation = await ChatConversation.findOne({ request: req.params.requestId })
      .populate("request", "bloodGroup unitsNeeded urgency status")
      .populate("hospital", "firstName lastName role phoneNumber")
      .populate("donor", "firstName lastName role phoneNumber bloodGroup")
      .populate("messages.sender", "firstName lastName role");

    if (!conversation || !canAccess(conversation, req.user._id)) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching conversation",
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const message = req.body.message?.trim();
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const conversation = await ChatConversation.findOne({ request: req.params.requestId });
    const request = await BloodRequest.findById(req.params.requestId);

    if (!conversation || !request || !canAccess(conversation, req.user._id)) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    conversation.messages.push({
      sender: req.user._id,
      message,
      readBy: [req.user._id],
    });
    await conversation.save();

    const populated = await ChatConversation.findById(conversation._id)
      .populate("messages.sender", "firstName lastName role")
      .populate("hospital", "firstName lastName")
      .populate("donor", "firstName lastName");
    const sent = populated.messages[populated.messages.length - 1];
    const recipient =
      String(req.user._id) === String(conversation.hospital)
        ? conversation.donor
        : conversation.hospital;

    emitToRequest(req.params.requestId, "chat:message", {
      requestId: req.params.requestId,
      message: sent,
    });
    emitToUser(recipient, "chat:unread", {
      requestId: req.params.requestId,
      message: sent,
    });

    return res.status(201).json({
      success: true,
      data: sent,
      message: "Message sent",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error sending message",
    });
  }
};
