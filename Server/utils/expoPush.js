/**
 * Expo Push Notification utility.
 *
 * Sends push notifications via Expo's free push service.
 * No Firebase/APNs config needed during development (Expo Go handles it).
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const https = require("https");
const UserModel = require("../models/user");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send a push notification to a single Expo push token.
 *
 * @param {string} expoPushToken  - e.g. "ExponentPushToken[xxxxxx]"
 * @param {object} options
 * @param {string} options.title  - Notification title
 * @param {string} options.body   - Notification body text
 * @param {object} [options.data] - Custom data payload (for deep-linking)
 * @param {string} [options.channelId] - Android notification channel
 * @param {string} [options.priority]  - "default" | "high"
 * @param {string} [options.sound]     - "default" or custom
 */
const sendExpoPush = (expoPushToken, options = {}) => {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) return;

  const payload = JSON.stringify({
    to: expoPushToken,
    title: options.title || "BloodLink",
    body: options.body || "",
    data: options.data || {},
    channelId: options.channelId || "bloodlink-default",
    priority: options.priority || "high",
    sound: options.sound || "default",
  });

  const urlObj = new URL(EXPO_PUSH_URL);
  const req = https.request(
    {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    },
    (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(body);
          const ticket = result?.data?.[0] || result?.data;
          if (ticket?.status === "error") {
            // Token is invalid or expired — clear it from the user
            if (
              ticket.details?.error === "DeviceNotRegistered" ||
              ticket.details?.error === "InvalidCredentials"
            ) {
              UserModel.updateOne(
                { expoPushToken },
                { $unset: { expoPushToken: "" } }
              ).catch(() => {});
            }
            console.warn("[ExpoPush] Error:", ticket.message);
          }
        } catch { /* ignore parse errors */ }
      });
    }
  );

  req.on("error", (err) => {
    console.warn("[ExpoPush] Request failed:", err.message);
  });

  req.write(payload);
  req.end();
};

/**
 * Send push notifications to multiple users by their user IDs.
 *
 * @param {string[]} userIds - Array of MongoDB user _id strings
 * @param {object} options   - Same as sendExpoPush options
 */
const sendExpoPushToUsers = async (userIds, options = {}) => {
  if (!userIds?.length) return;

  try {
    const users = await UserModel.find(
      { _id: { $in: userIds }, expoPushToken: { $exists: true, $ne: null } },
      { expoPushToken: 1 }
    ).lean();

    for (const user of users) {
      if (user.expoPushToken) {
        sendExpoPush(user.expoPushToken, options);
      }
    }
  } catch (err) {
    console.warn("[ExpoPush] sendExpoPushToUsers error:", err.message);
  }
};

module.exports = { sendExpoPush, sendExpoPushToUsers };
