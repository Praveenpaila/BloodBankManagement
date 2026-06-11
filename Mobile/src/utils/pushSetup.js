/**
 * Expo Push Notification Setup
 *
 * Handles:
 * 1. Permission request + token registration
 * 2. Android notification channels (alarm-like for SOS)
 * 3. Foreground notification display
 *
 * NOTE: Remote push notifications require a development build.
 * In Expo Go, this will gracefully degrade (no crash, just no remote push).
 */

import { Platform, Alert } from "react-native";
import * as Device from "expo-device";

// Lazy-load expo-notifications to avoid crash if module has issues
let Notifications = null;
try {
  Notifications = require("expo-notifications");
} catch {
  console.warn("[Push] expo-notifications not available");
}

// ── Show notifications even when app is in foreground ──────────────────────────
if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ── Android notification channels ──────────────────────────────────────────────
async function setupAndroidChannels() {
  if (Platform.OS !== "android" || !Notifications) return;

  try {
    // Default channel — normal alerts
    await Notifications.setNotificationChannelAsync("bloodlink-default", {
      name: "BloodLink Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#E53E3E",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    // SOS channel — alarm-like, maximum importance
    await Notifications.setNotificationChannelAsync("bloodlink-sos", {
      name: "SOS Blood Requests",
      description: "Urgent blood request alerts — alarm-like notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: "#DC2626",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC,
    });
  } catch (err) {
    console.warn("[Push] Channel setup error:", err.message);
  }
}

// ── Register for push notifications ──────────────────────────────────────────
// apiBase and authToken are passed in to avoid circular imports
async function registerForPushNotifications(authToken, apiBase) {
  if (!Notifications) {
    console.log("[Push] expo-notifications not available, skipping");
    return null;
  }

  // Must be a physical device
  if (!Device.isDevice) {
    console.log("[Push] Must use physical device for push notifications");
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permission not granted");
      return null;
    }

    // Set up Android channels
    await setupAndroidChannels();

    // Get the Expo push token
    // This will FAIL in Expo Go (SDK 53+) — that's expected
    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    const expoPushToken = pushTokenData.data;

    console.log("[Push] ExpoPushToken:", expoPushToken);

    // Register token with server
    if (authToken && expoPushToken && apiBase) {
      try {
        await fetch(`${apiBase}/push/expo-register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token: expoPushToken }),
        });
        console.log("[Push] Token registered with server");
      } catch (err) {
        console.warn("[Push] Failed to register token:", err.message);
      }
    }

    return expoPushToken;
  } catch (err) {
    // Expected to fail in Expo Go — don't crash
    console.warn("[Push] Push registration unavailable:", err.message);
    return null;
  }
}

// ── Unregister push token (call on logout) ──────────────────────────────────
async function unregisterPushToken(authToken, apiBase) {
  if (!authToken || !apiBase) return;
  try {
    await fetch(`${apiBase}/push/expo-unregister`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({}),
    });
  } catch {
    // ignore
  }
}

// ── Add notification response listener ──────────────────────────────────────
function addNotificationResponseListener(callback) {
  if (!Notifications?.addNotificationResponseReceivedListener) return null;
  return Notifications.addNotificationResponseReceivedListener(callback);
}

function removeNotificationSubscription(subscription) {
  if (!Notifications?.removeNotificationSubscription || !subscription) return;
  Notifications.removeNotificationSubscription(subscription);
}

export {
  registerForPushNotifications,
  unregisterPushToken,
  addNotificationResponseListener,
  removeNotificationSubscription,
};
