import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { io } from "socket.io-client";
import * as Notifications from "expo-notifications";
import { registerForPushNotifications, unregisterPushToken } from "../utils/pushSetup";

const AppContext = createContext();

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
export const TOKEN_KEY = "bloodlink_token";


const envUrl = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE =
  envUrl && envUrl.trim().length > 0
    ? envUrl.trim().replace(/\/$/, "")
    : "http://172.20.10.3:3000/api";

// Socket URL is the root (strip /api suffix)
export const SOCKET_URL = API_BASE.replace(/\/api\/?$/, "");

const SOS_ALERT_DURATION_MS = 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const empty = {
  donorStats: { totalDonations: 0, points: 0, badges: [] },
  eligibility: {},
};

export const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "N/A";

export const titleCase = (value = "") =>
  value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const useForm = (initial) => {
  const [form, setForm] = useState(initial);
  const setField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  return [form, setField, setForm];
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState("home");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [activeSos, setActiveSos] = useState(null);
  const [eligibilityTick, setEligibilityTick] = useState(0);
  const [donationTick, setDonationTick] = useState(0);
  // Connection status: 'unknown' | 'connected' | 'disconnected'
  const [serverStatus, setServerStatus] = useState("unknown");
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const sosAlertTimer = useRef(null);
  const notificationResponseListener = useRef(null);

  // ── Health check ────────────────────────────────────────────────────────────
  const checkServer = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${API_BASE.replace(/\/api\/?$/, "")}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        setServerStatus("connected");
        return true;
      }
      setServerStatus("disconnected");
      return false;
    } catch {
      setServerStatus("disconnected");
      return false;
    }
  }, []);

  // Run health check on mount and every 30 seconds
  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 30_000);
    return () => clearInterval(interval);
  }, [checkServer]);

  // ── API helper ──────────────────────────────────────────────────────────────
  const api = useCallback(
    async (path, options = {}) => {
      const isMutation = options.method && options.method.toUpperCase() !== "GET";
      if (isMutation) setLoading(true);
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      };
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        const res = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
          signal: controller.signal,
          body:
            options.body && typeof options.body !== "string"
              ? JSON.stringify(options.body)
              : options.body,
        });
        clearTimeout(timeout);
        setServerStatus("connected");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Request failed");
        return data;
      } catch (err) {
        if (err.name === "AbortError") {
          setServerStatus("disconnected");
          throw new Error(
            `Cannot reach server at ${API_BASE}. ` +
              (Platform.OS === "android"
                ? "If using a physical device, set EXPO_PUBLIC_API_URL to your PC's LAN IP."
                : "Make sure the server is running.")
          );
        }
        // Network failure
        if (!err.message?.includes("Request failed")) {
          setServerStatus("disconnected");
        }
        throw err;
      } finally {
        if (isMutation) setLoading(false);
      }
    },
    [token]
  );

  // ── Token persistence ───────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then((saved) => {
        if (saved) setToken(saved);
      })
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (booting) return;
    if (token) AsyncStorage.setItem(TOKEN_KEY, token);
    else AsyncStorage.removeItem(TOKEN_KEY);
  }, [token, booting]);

  // ── Push notification registration ──────────────────────────────────────────
  useEffect(() => {
    if (!token || booting || !user) return;
    registerForPushNotifications(token);
  }, [token, booting, user]);

  // ── Handle notification taps → deep-link to correct screen ────────────────
  useEffect(() => {
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.screen) {
          setRoute(data.screen);
        }
      });

    return () => {
      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(
          notificationResponseListener.current
        );
      }
    };
  }, []);

  // ── Fetch current user ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || booting) return undefined;
    let active = true;
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        setServerStatus("connected");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Session expired");
        if (!active) return;
        setUser(data.data);
        setRoute((current) =>
          current === "home" || current === "login"
            ? `${data.data.role}:dashboard`
            : current
        );
      } catch (err) {
        if (!active) return;
        if (err.name === "AbortError" || err.message?.toLowerCase().includes("network")) {
          setServerStatus("disconnected");
          // Don't log out on network error — keep token, just show banner
          return;
        }
        setToken("");
        setUser(null);
        setRoute("home");
      }
    })();
    return () => {
      active = false;
    };
  }, [token, booting]);

  // ── Socket setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      setServerStatus("connected");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("connect_error", (err) => {
      setSocketConnected(false);
      setServerStatus("disconnected");
      console.warn("[Socket] connect_error:", err.message);
    });

    const clearSosAlertTimer = () => {
      if (sosAlertTimer.current) {
        clearTimeout(sosAlertTimer.current);
        sosAlertTimer.current = null;
      }
    };

    socket.on("blood-request:new", (notification) => {
      if (user?.role === "donor" && !notification?.data?.closed) {
        clearSosAlertTimer();
        setActiveSos(notification);
        sosAlertTimer.current = setTimeout(() => {
          clearSosAlertTimer();
          setActiveSos((current) =>
            String(current?.data?.requestId) ===
            String(notification?.data?.requestId)
              ? null
              : current
          );
        }, SOS_ALERT_DURATION_MS);
      }
      Alert.alert(
        "Blood request",
        notification?.message || "A nearby request needs help."
      );
    });

    socket.on("blood-request:closed", (payload = {}) => {
      clearSosAlertTimer();
      setActiveSos((current) =>
        String(current?.data?.requestId) === String(payload.requestId)
          ? null
          : current
      );
      Alert.alert(
        "Request covered",
        payload.message || "Another donor accepted this request."
      );
    });

    socket.on("blood-request:response", (notification = {}) => {
      Alert.alert(
        "Donor response",
        notification.message || "A donor responded to your request."
      );
    });

    socket.on("chat:ready", ({ requestId } = {}) => {
      Alert.alert("Chat ready", "Open the request chat now?", [
        { text: "Later" },
        { text: "Open", onPress: () => setRoute(`chat:${requestId}`) },
      ]);
    });

    socket.on("donation:recorded", (payload = {}) => {
      const badgeText = payload.badges?.length
        ? `\nBadges: ${payload.badges.join(", ")}`
        : "";
      Alert.alert(
        "Donation recorded",
        `+${payload.pointsAwarded || 0} points earned. Total donations: ${payload.totalDonations || 0}.${badgeText}`
      );
      setDonationTick((tick) => tick + 1);
      setEligibilityTick((tick) => tick + 1);
    });

    socket.on("eligibility:deferred", () => {
      Alert.alert(
        "Eligibility updated",
        "You are deferred for 30 days after donation."
      );
      setEligibilityTick((tick) => tick + 1);
    });

    return () => {
      clearSosAlertTimer();
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [token, user?.role]);

  // ── Auth actions ─────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(data.token);
      setUser(data.user);
      setRoute(`${data.user.role}:dashboard`);
    } catch (err) {
      Alert.alert("Login failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const data = await api("/auth/signup", { method: "POST", body: payload });
      setToken(data.token);
      setUser(data.user);
      setRoute(`${data.user.role}:dashboard`);
    } catch (err) {
      Alert.alert("Register failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await unregisterPushToken(token);
    setToken("");
    setUser(null);
    setRoute("home");
    await AsyncStorage.removeItem(TOKEN_KEY);
  };

  const respondToSos = async (action) => {
    const requestId = activeSos?.data?.requestId;
    if (!requestId) return;
    if (sosAlertTimer.current) {
      clearTimeout(sosAlertTimer.current);
      sosAlertTimer.current = null;
    }
    try {
      const data = await api(`/blood-requests/${requestId}/respond`, {
        method: "PUT",
        body: { action },
      });
      setActiveSos(null);
      if (action === "accept") {
        setRoute(`chat:${data?.data?.request?._id || requestId}`);
      }
      Alert.alert(
        "Saved",
        action === "accept"
          ? "Request accepted. Opening chat."
          : "Response saved."
      );
    } catch (err) {
      Alert.alert("Response failed", err.message);
      if (String(err.message).includes("already been accepted"))
        setActiveSos(null);
    }
  };

  const updateLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error("Location permission denied");
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const data = await api("/donors/location", {
        method: "PUT",
        body: { lat: position.coords.latitude, lng: position.coords.longitude },
      });
      setUser(data.data);
      Alert.alert("Location updated");
    } catch (err) {
      Alert.alert("Location failed", err.message);
    }
  };

  // ── Context value ─────────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      api,
      user,
      setUser,
      route,
      setRoute,
      socket: socketRef.current,
      login,
      register,
      logout,
      respondToSos,
      updateLocation,
      checkServer,
      eligibilityTick,
      donationTick,
      loading,
      setLoading,
      booting,
      activeSos,
      setActiveSos,
      serverStatus,
      socketConnected,
      apiBase: API_BASE,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, user, route, eligibilityTick, donationTick, loading, booting, activeSos, serverStatus, socketConnected]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
