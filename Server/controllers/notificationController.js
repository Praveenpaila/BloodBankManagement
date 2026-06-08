const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching notifications",
    });
  }
};

exports.markOneRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
      message: "Notification marked as read",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error updating notification",
    });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id }, { isRead: true });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error updating notifications",
    });
  }
};

exports.deleteOne = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error deleting notification",
    });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });

    return res.status(200).json({
      success: true,
      message: "Notifications cleared",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error clearing notifications",
    });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const notification = await Notification.create({
      recipient: req.body.recipient,
      type: req.body.type || "direct",
      title: req.body.title,
      message: req.body.message,
      data: req.body.data || {},
    });

    return res.status(201).json({
      success: true,
      data: notification,
      message: "Notification sent",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error creating notification",
    });
  }
};
