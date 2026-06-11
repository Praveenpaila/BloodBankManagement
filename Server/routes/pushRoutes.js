const express = require("express");
const PushSubscription = require("../models/PushSubscription");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.post("/subscribe", protect, async (req, res) => {
  try {
    const subscription = req.body;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({
        success: false,
        message: "Valid push subscription is required",
      });
    }

    await PushSubscription.findOneAndUpdate(
      { "subscription.endpoint": endpoint },
      {
        user: req.user._id,
        subscription: {
          endpoint,
          keys: { p256dh, auth },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error saving push subscription",
    });
  }
});

router.post("/unsubscribe", protect, async (req, res) => {
  try {
    const endpoint = req.body?.endpoint || req.body?.subscription?.endpoint;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: "Subscription endpoint is required",
      });
    }

    await PushSubscription.deleteOne({
      user: req.user._id,
      "subscription.endpoint": endpoint,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error removing push subscription",
    });
  }
});

// ─── Expo Push Token (mobile app) ────────────────────────────────────────────

router.post("/expo-register", protect, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || !token.startsWith("ExponentPushToken")) {
      return res.status(400).json({
        success: false,
        message: "Valid Expo push token is required",
      });
    }

    // Clear this token from any other user (token is device-specific)
    const UserModel = require("../models/user");
    await UserModel.updateMany(
      { expoPushToken: token, _id: { $ne: req.user._id } },
      { $unset: { expoPushToken: "" } }
    );

    // Save to current user
    await UserModel.findByIdAndUpdate(req.user._id, { expoPushToken: token });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error registering Expo push token",
    });
  }
});

router.post("/expo-unregister", protect, async (req, res) => {
  try {
    const UserModel = require("../models/user");
    await UserModel.findByIdAndUpdate(req.user._id, {
      $unset: { expoPushToken: "" },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error unregistering Expo push token",
    });
  }
});

module.exports = router;
