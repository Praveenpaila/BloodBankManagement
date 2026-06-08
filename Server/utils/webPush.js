const webpush = require("web-push");

const hasVapidConfig =
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL;

if (hasVapidConfig) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

const sendPushNotification = async (subscription, payload) => {
  if (!hasVapidConfig || !subscription) return;

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      throw { expired: true };
    }
  }
};

module.exports = { sendPushNotification };
