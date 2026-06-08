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

module.exports = router;
