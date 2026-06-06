import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { io } from "socket.io-client";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const TOKEN_KEY = "bloodlink_token";
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:3000/api" : "http://localhost:3000/api");
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, "");

const empty = {
  donorStats: { totalDonations: 0, points: 0, badges: [] },
  eligibility: {},
};

const fmtDate = (value) => (value ? new Date(value).toLocaleDateString() : "N/A");
const titleCase = (value = "") => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const useForm = (initial) => {
  const [form, setForm] = useState(initial);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return [form, setField, setForm];
};

function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState("home");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [activeSos, setActiveSos] = useState(null);
  const [eligibilityTick, setEligibilityTick] = useState(0);
  const [donationTick, setDonationTick] = useState(0);
  const socketRef = useRef(null);

  const api = useCallback(
    async (path, options = {}) => {
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      };
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Request failed");
      return data;
    },
    [token],
  );

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

  useEffect(() => {
    if (!token || booting) return undefined;
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Session expired");
        if (!active) return;
        setUser(data.data);
        setRoute((current) => (current === "home" || current === "login" ? `${data.data.role}:dashboard` : current));
      } catch {
        if (active) {
          setToken("");
          setUser(null);
          setRoute("home");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [token, booting]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("blood-request:new", (notification) => {
      if (user?.role === "donor" && !notification?.data?.closed) {
        setActiveSos(notification);
      }
      Alert.alert("Blood request", notification?.message || "A nearby request needs help.");
    });
    socket.on("blood-request:closed", (payload = {}) => {
      setActiveSos((current) => (String(current?.data?.requestId) === String(payload.requestId) ? null : current));
      Alert.alert("Request covered", payload.message || "Another donor accepted this request.");
    });
    socket.on("blood-request:response", (notification = {}) => {
      Alert.alert("Donor response", notification.message || "A donor responded to your request.");
    });
    socket.on("chat:ready", ({ requestId } = {}) => {
      Alert.alert("Chat ready", "Open the request chat now?", [
        { text: "Later" },
        { text: "Open", onPress: () => setRoute(`chat:${requestId}`) },
      ]);
    });
    socket.on("donation:recorded", (payload = {}) => {
      const badgeText = payload.badges?.length ? `\nBadges: ${payload.badges.join(", ")}` : "";
      Alert.alert(
        "Donation recorded",
        `+${payload.pointsAwarded || 0} points earned. Total donations: ${payload.totalDonations || 0}.${badgeText}`,
      );
      setDonationTick((tick) => tick + 1);
      setEligibilityTick((tick) => tick + 1);
    });
    socket.on("eligibility:deferred", () => {
      Alert.alert("Eligibility updated", "You are deferred for 30 days after donation.");
      setEligibilityTick((tick) => tick + 1);
    });
    return () => socket.disconnect();
  }, [token, user?.role]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api("/auth/login", { method: "POST", body: { email, password } });
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
    setToken("");
    setUser(null);
    setRoute("home");
    await AsyncStorage.removeItem(TOKEN_KEY);
  };

  const respondToSos = async (action) => {
    const requestId = activeSos?.data?.requestId;
    if (!requestId) return;
    try {
      const data = await api(`/blood-requests/${requestId}/respond`, { method: "PUT", body: { action } });
      setActiveSos(null);
      if (action === "accept") {
        setRoute(`chat:${data?.data?.request?._id || requestId}`);
      }
      Alert.alert("Saved", action === "accept" ? "Request accepted. Opening chat." : "Response saved.");
    } catch (err) {
      Alert.alert("Response failed", err.message);
      if (String(err.message).includes("already been accepted")) setActiveSos(null);
    }
  };

  const ctx = useMemo(
    () => ({ api, user, setUser, route, setRoute, socket: socketRef.current, login, register, logout, eligibilityTick, donationTick }),
    [api, user, route, eligibilityTick, donationTick],
  );

  if (booting) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingOverlay />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {loading && <LoadingOverlay />}
      {!user ? <PublicApp ctx={ctx} /> : <ProtectedApp ctx={ctx} />}
      {activeSos ? (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalShade}>
            <View style={styles.modalCard}>
              <Text style={styles.eyebrow}>Emergency SOS nearby</Text>
              <Text style={styles.cardTitle}>{activeSos.title}</Text>
              <Text style={styles.body}>{activeSos.message}</Text>
              <Text style={styles.body}>{activeSos.data?.bloodGroup} | {activeSos.data?.distance || "Distance pending"}</Text>
              <View style={styles.row}>
                <Button label="Accept" onPress={() => respondToSos("accept")} />
                <Button label="Decline" tone="outline" onPress={() => respondToSos("decline")} />
                <Button label="Dismiss" tone="ghost" onPress={() => setActiveSos(null)} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function PublicApp({ ctx }) {
  if (ctx.route === "login") return <LoginScreen ctx={ctx} />;
  if (ctx.route === "register") return <RegisterScreen ctx={ctx} />;
  if (ctx.route === "forgot") return <ForgotPasswordScreen ctx={ctx} />;
  if (ctx.route === "publicSearch") return <PublicSearchScreen ctx={ctx} />;
  if (ctx.route === "contact") return <ContactScreen ctx={ctx} />;
  return <HomeScreen ctx={ctx} />;
}

function ProtectedApp({ ctx }) {
  const { user, route } = ctx;
  if (route.startsWith("chat:")) return <ChatScreen ctx={ctx} requestId={route.split(":")[1]} />;
  if (user.role === "donor") return <DonorApp ctx={ctx} />;
  if (user.role === "hospital") return <HospitalApp ctx={ctx} />;
  return <AdminApp ctx={ctx} />;
}

function Shell({ ctx, title, children, tabs = [] }) {
  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.eyebrow}>BloodLink Mobile</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        {ctx.user ? <Button label="Logout" tone="ghost" onPress={ctx.logout} /> : null}
      </View>
      {tabs.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.route}
              style={[styles.tab, ctx.route === tab.route && styles.tabActive]}
              onPress={() => ctx.setRoute(tab.route)}
            >
              <Text style={[styles.tabText, ctx.route === tab.route && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </View>
  );
}

function HomeScreen({ ctx }) {
  return (
    <Shell ctx={ctx} title="Donate blood. Request blood. Stay connected.">
      <Card>
        <Text style={styles.hero}>Every urgent request, donor alert, hospital workflow, and admin action now has a mobile path.</Text>
        <View style={styles.row}>
          <Button label="Login" onPress={() => ctx.setRoute("login")} />
          <Button label="Register" tone="outline" onPress={() => ctx.setRoute("register")} />
        </View>
      </Card>
      <View style={styles.grid}>
        <Button label="Search donors" tone="outline" onPress={() => ctx.setRoute("publicSearch")} />
        <Button label="Contact" tone="outline" onPress={() => ctx.setRoute("contact")} />
      </View>
    </Shell>
  );
}

function LoginScreen({ ctx }) {
  const [form, setField] = useForm({ email: "", password: "" });
  return (
    <Shell ctx={ctx} title="Login">
      <Card>
        <Input label="Email" value={form.email} onChangeText={(v) => setField("email", v)} autoCapitalize="none" />
        <Input label="Password" value={form.password} onChangeText={(v) => setField("password", v)} secureTextEntry />
        <Button label="Login" onPress={() => ctx.login(form.email, form.password)} />
        <Button label="Forgot password" tone="ghost" onPress={() => ctx.setRoute("forgot")} />
        <Button label="Create account" tone="ghost" onPress={() => ctx.setRoute("register")} />
      </Card>
    </Shell>
  );
}

function RegisterScreen({ ctx }) {
  const [form, setField] = useForm({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    otp: "",
    role: "donor",
    bloodGroup: "O+",
    dob: "",
    gender: "male",
    emergencyContact: "",
    age: "",
    city: "",
    hospitalName: "",
    address: "",
    pincode: "",
    licenseNumber: "",
  });
  const sendOtp = async () => {
    try {
      const data = await ctx.api("/auth/send-otp", { method: "POST", body: { email: form.email, phoneNumber: form.phoneNumber } });
      Alert.alert("OTP sent", data.data?.otp ? `Development OTP: ${data.data.otp}` : "Check your email.");
    } catch (err) {
      Alert.alert("OTP failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Register">
      <Card>
        <Segment value={form.role} options={["donor", "hospital"]} onChange={(v) => setField("role", v)} />
        <Input label={form.role === "hospital" ? "Contact first name" : "First name"} value={form.firstName} onChangeText={(v) => setField("firstName", v)} />
        <Input label="Last name" value={form.lastName} onChangeText={(v) => setField("lastName", v)} />
        <Input label="Email" value={form.email} onChangeText={(v) => setField("email", v)} autoCapitalize="none" />
        <Input label="Phone" value={form.phoneNumber} onChangeText={(v) => setField("phoneNumber", v)} />
        <Button label="Send OTP" tone="outline" onPress={sendOtp} />
        <Input label="OTP" value={form.otp} onChangeText={(v) => setField("otp", v)} keyboardType="numeric" />
        <Input label="Password" value={form.password} onChangeText={(v) => setField("password", v)} secureTextEntry />
        <Input label="City" value={form.city} onChangeText={(v) => setField("city", v)} />
        {form.role === "donor" ? (
          <>
            <PickerRow label="Blood group" value={form.bloodGroup} options={BLOOD_GROUPS} onChange={(v) => setField("bloodGroup", v)} />
            <Input label="Date of birth YYYY-MM-DD" value={form.dob} onChangeText={(v) => setField("dob", v)} />
            <PickerRow label="Gender" value={form.gender} options={["male", "female", "other"]} onChange={(v) => setField("gender", v)} />
            <Input label="Emergency contact" value={form.emergencyContact} onChangeText={(v) => setField("emergencyContact", v)} />
            <Input label="Age" value={form.age} onChangeText={(v) => setField("age", v)} keyboardType="numeric" />
          </>
        ) : null}
        {form.role === "hospital" ? (
          <>
            <Input label="Hospital name" value={form.hospitalName} onChangeText={(v) => setField("hospitalName", v)} />
            <Input label="Address" value={form.address} onChangeText={(v) => setField("address", v)} />
            <Input label="Pincode" value={form.pincode} onChangeText={(v) => setField("pincode", v)} />
            <Input label="License number" value={form.licenseNumber} onChangeText={(v) => setField("licenseNumber", v)} />
          </>
        ) : null}
        <Button label="Create account" onPress={() => ctx.register(form)} />
      </Card>
    </Shell>
  );
}

function ForgotPasswordScreen({ ctx }) {
  const [step, setStep] = useState("email");
  const [form, setField] = useForm({ email: "", token: "", newPassword: "" });
  const submit = async () => {
    try {
      if (step === "email") {
        await ctx.api("/auth/forgot-password", { method: "POST", body: { email: form.email } });
        setStep("reset");
        Alert.alert("Reset code sent");
      } else {
        await ctx.api("/auth/reset-password", { method: "POST", body: { token: form.token, newPassword: form.newPassword } });
        Alert.alert("Password reset", "You can login now.");
        ctx.setRoute("login");
      }
    } catch (err) {
      Alert.alert("Reset failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Forgot password">
      <Card>
        {step === "email" ? <Input label="Email" value={form.email} onChangeText={(v) => setField("email", v)} /> : null}
        {step === "reset" ? (
          <>
            <Input label="Reset code" value={form.token} onChangeText={(v) => setField("token", v)} />
            <Input label="New password" value={form.newPassword} onChangeText={(v) => setField("newPassword", v)} secureTextEntry />
          </>
        ) : null}
        <Button label={step === "email" ? "Send code" : "Reset password"} onPress={submit} />
      </Card>
    </Shell>
  );
}

function PublicSearchScreen({ ctx }) {
  const [filters, setField] = useForm({ bloodGroup: "", city: "" });
  const [results, setResults] = useState([]);
  const search = async () => {
    try {
      const query = new URLSearchParams(filters).toString();
      const data = await ctx.api(`/donors/search?${query}`);
      setResults(data.data || []);
    } catch (err) {
      Alert.alert("Search failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Public donor search">
      <Card>
        <PickerRow label="Blood group" value={filters.bloodGroup} options={["", ...BLOOD_GROUPS]} onChange={(v) => setField("bloodGroup", v)} />
        <Input label="City" value={filters.city} onChangeText={(v) => setField("city", v)} />
        <Button label="Search" onPress={search} />
      </Card>
      <List data={results} empty="No public donor matches yet." renderItem={(item) => <DonorCard donor={item} />} />
    </Shell>
  );
}

function ContactScreen({ ctx }) {
  const [form, setField, setForm] = useForm({ name: "", email: "", subject: "", message: "" });
  return (
    <Shell ctx={ctx} title="Contact">
      <Card>
        <Text style={styles.body}>Phone: +91 90000 00000</Text>
        <Text style={styles.body}>Email: support@bloodlink.com</Text>
        <Text style={styles.body}>Address: Vijayawada, Andhra Pradesh</Text>
      </Card>
      <Card>
        <Input label="Your name" value={form.name} onChangeText={(v) => setField("name", v)} />
        <Input label="Email" value={form.email} onChangeText={(v) => setField("email", v)} autoCapitalize="none" />
        <Input label="Subject" value={form.subject} onChangeText={(v) => setField("subject", v)} />
        <Input label="Message" value={form.message} onChangeText={(v) => setField("message", v)} multiline />
        <Button label="Send message" onPress={() => { Alert.alert("Message sent", "We'll get back to you soon."); setForm({ name: "", email: "", subject: "", message: "" }); }} />
      </Card>
    </Shell>
  );
}

const donorTabs = [
  ["Dashboard", "donor:dashboard"],
  ["Profile", "donor:profile"],
  ["Eligibility", "donor:eligibility"],
  ["Appointments", "donor:appointments"],
  ["History", "donor:history"],
  ["Badges", "donor:badges"],
  ["Notifications", "donor:notifications"],
  ["Nearby", "donor:nearby"],
  ["SOS", "donor:sos"],
].map(([label, route]) => ({ label, route }));

function DonorApp({ ctx }) {
  const route = ctx.route.startsWith("donor:") ? ctx.route : "donor:dashboard";
  const props = { ctx, tabs: donorTabs };
  if (route === "donor:profile") return <DonorProfile {...props} />;
  if (route === "donor:eligibility") return <EligibilityScreen {...props} />;
  if (route === "donor:appointments") return <AppointmentScreen {...props} />;
  if (route === "donor:history") return <DonationHistoryScreen {...props} />;
  if (route === "donor:badges") return <BadgesScreen {...props} />;
  if (route === "donor:notifications") return <NotificationsScreen {...props} />;
  if (route === "donor:nearby") return <NearbyRequestsScreen {...props} />;
  if (route === "donor:sos") return <RaiseRequestScreen {...props} donorSos />;
  return <DonorDashboard {...props} />;
}

function DonorDashboard({ ctx, tabs }) {
  const [data, setData] = useState(null);
  useLoader(ctx, async () => {
    const [eligibility, stats, history, notifications] = await Promise.all([
      ctx.api("/eligibility/status"),
      ctx.api("/loyalty/my-stats"),
      ctx.api("/donations/my-history"),
      ctx.api("/notifications"),
    ]);
    setData({
      eligibility: eligibility.data || empty.eligibility,
      stats: stats.data || empty.donorStats,
      donations: history.data || [],
      notifications: notifications.data || [],
    });
  }, [ctx.eligibilityTick, ctx.donationTick]);
  return (
    <Shell ctx={ctx} title={`Welcome, ${ctx.user.firstName || "Donor"}`} tabs={tabs}>
      <DeferredBanner eligibility={data?.eligibility} />
      <View style={styles.grid}>
        <Stat label="Donations" value={data?.stats?.totalDonations || 0} />
        <Stat label="Points" value={data?.stats?.points || 0} />
        <Stat label="Badges" value={data?.stats?.badges?.length || 0} />
        <Stat label="Next eligible" value={data?.eligibility?.deferralUntil ? fmtDate(data.eligibility.deferralUntil) : "Now"} />
      </View>
      <Card>
        <Text style={styles.cardTitle}>Eligibility</Text>
        <Text style={styles.body}>{titleCase(data?.eligibility?.status || data?.eligibility?.record?.status || "not checked")}</Text>
        <Button label="Check eligibility" onPress={() => ctx.setRoute("donor:eligibility")} />
      </Card>
      <List data={(data?.notifications || []).slice(0, 3)} empty="No alerts yet." renderItem={(item) => <NotificationCard item={item} ctx={ctx} />} />
    </Shell>
  );
}

function DonorProfile({ ctx, tabs }) {
  const [form, setField] = useForm({
    firstName: ctx.user.firstName || "",
    lastName: ctx.user.lastName || "",
    phoneNumber: ctx.user.phoneNumber || "",
    city: ctx.user.city || "",
    bloodGroup: ctx.user.bloodGroup || "O+",
  });
  const save = async () => {
    try {
      const data = await ctx.api("/auth/me", { method: "PUT", body: form });
      ctx.setUser(data.data);
      Alert.alert("Saved", "Profile updated.");
    } catch (err) {
      Alert.alert("Profile failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="My profile" tabs={tabs}>
      <Card>
        <Input label="First name" value={form.firstName} onChangeText={(v) => setField("firstName", v)} />
        <Input label="Last name" value={form.lastName} onChangeText={(v) => setField("lastName", v)} />
        <Input label="Phone" value={form.phoneNumber} onChangeText={(v) => setField("phoneNumber", v)} />
        <Input label="City" value={form.city} onChangeText={(v) => setField("city", v)} />
        <PickerRow label="Blood group" value={form.bloodGroup} options={BLOOD_GROUPS} onChange={(v) => setField("bloodGroup", v)} />
        <Button label="Save profile" onPress={save} />
        <Button label="Update location" tone="outline" onPress={() => updateLocation(ctx)} />
      </Card>
    </Shell>
  );
}

function EligibilityScreen({ ctx, tabs }) {
  const [previous, setPrevious] = useState(null);
  const [result, setResult] = useState(null);
  const [form, setField] = useForm({
    age: "",
    weight: "",
    recentIllness: false,
    medications: false,
    travelHistory: false,
    tattooPiercing: false,
    hemoglobin: "",
    gender: "male",
  });
  useLoader(ctx, async () => setPrevious((await ctx.api("/eligibility/status")).data), [ctx.eligibilityTick]);
  const submit = async () => {
    try {
      const data = await ctx.api("/eligibility/check", { method: "POST", body: form });
      setResult(data.data);
    } catch (err) {
      Alert.alert("Eligibility failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Eligibility check" tabs={tabs}>
      <DeferredBanner eligibility={previous} />
      {previous ? <Card><Text style={styles.body}>Previous result: {titleCase(previous.status || previous.record?.status || "")}</Text></Card> : null}
      <Card>
        <Input label="Age" value={form.age} onChangeText={(v) => setField("age", v)} keyboardType="numeric" />
        <Input label="Weight" value={form.weight} onChangeText={(v) => setField("weight", v)} keyboardType="numeric" />
        <Toggle label="Recent illness" value={form.recentIllness} onChange={(v) => setField("recentIllness", v)} />
        <Toggle label="Medications" value={form.medications} onChange={(v) => setField("medications", v)} />
        <Toggle label="Travel history" value={form.travelHistory} onChange={(v) => setField("travelHistory", v)} />
        <Toggle label="Tattoo or piercing" value={form.tattooPiercing} onChange={(v) => setField("tattooPiercing", v)} />
        <Input label="Hemoglobin" value={form.hemoglobin} onChangeText={(v) => setField("hemoglobin", v)} keyboardType="numeric" />
        <PickerRow label="Gender" value={form.gender} options={["male", "female", "other"]} onChange={(v) => setField("gender", v)} />
        <Button label="Submit" onPress={submit} />
      </Card>
      {result ? <Card><Text style={styles.cardTitle}>{titleCase(result.status)}</Text><Text style={styles.body}>{result.reason || "You can donate."}</Text></Card> : null}
    </Shell>
  );
}

function AppointmentScreen({ ctx, tabs }) {
  const [data, setData] = useState({ hospitals: [], eligibility: {} });
  const [confirmed, setConfirmed] = useState(null);
  const [form, setField] = useForm({ hospital: "", date: "", timeSlot: "Morning" });
  useLoader(ctx, async () => {
    const [eligibility, hospitals] = await Promise.all([ctx.api("/eligibility/status"), ctx.api("/hospitals/list")]);
    setData({ eligibility: eligibility.data, hospitals: hospitals.data || [] });
  });
  const submit = async () => {
    try {
      await ctx.api("/appointments", { method: "POST", body: form });
      setConfirmed({ ...form, hospitalName: data.hospitals.find((h) => h._id === form.hospital)?.firstName || "Selected hospital" });
      Alert.alert("Confirmed", "Appointment booked.");
    } catch (err) {
      Alert.alert("Appointment failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Book appointment" tabs={tabs}>
      {data.eligibility?.status !== "eligible" ? <Card><Text style={styles.body}>Complete an eligible check before booking.</Text></Card> : null}
      <Card>
        <PickerRow label="Hospital" value={form.hospital} options={["", ...data.hospitals.map((h) => h._id)]} labels={{ "": "Select hospital", ...Object.fromEntries(data.hospitals.map((h) => [h._id, h.hospitalName || h.firstName])) }} onChange={(v) => setField("hospital", v)} />
        <Input label="Date YYYY-MM-DD" value={form.date} onChangeText={(v) => setField("date", v)} />
        <PickerRow label="Time slot" value={form.timeSlot} options={["Morning", "Afternoon", "Evening"]} onChange={(v) => setField("timeSlot", v)} />
        <Button label="Book appointment" onPress={submit} />
      </Card>
      {confirmed ? <Card><Text style={styles.cardTitle}>Appointment confirmed</Text><Text>{confirmed.hospitalName} | {confirmed.date} | {confirmed.timeSlot}</Text></Card> : null}
    </Shell>
  );
}

function DonationHistoryScreen({ ctx, tabs }) {
  const [items, setItems] = useState([]);
  useLoader(ctx, async () => setItems((await ctx.api("/donations/my-history")).data || []), [ctx.donationTick]);
  return (
    <Shell ctx={ctx} title="Donation history" tabs={tabs}>
      <List
        data={items}
        empty="You haven't donated yet. Book your first appointment!"
        renderItem={(item) => (
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{fmtDate(item.donationDate)}</Text>
              <BloodGroupPill group={item.bloodGroup} />
            </View>
            <Text>{item.hospital?.hospitalName || item.hospital?.firstName || "Hospital"} | {item.units} unit(s)</Text>
            <Text style={item.source === "sos" ? styles.sosTag : item.source === "appointment" ? styles.appointmentTag : styles.regularTag}>{item.source === "sos" ? "SOS donation" : item.source === "appointment" ? "Appointment donation" : "Regular donation"}</Text>
            {item.certificateId ? <Text style={styles.muted}>Certificate: {item.certificateId}</Text> : null}
          </Card>
        )}
      />
      {!items.length ? <Button label="Book appointment" onPress={() => ctx.setRoute("donor:appointments")} /> : null}
    </Shell>
  );
}

function BadgesScreen({ ctx, tabs }) {
  const [data, setData] = useState({ stats: null, leaderboard: [] });
  const allBadges = ["First Drop", "Life Saver", "Blood Hero", "Rare Type", "Monthly Champion", "Emergency Responder"];
  useLoader(ctx, async () => {
    const [stats, leaderboard] = await Promise.all([ctx.api("/loyalty/my-stats"), ctx.api("/loyalty/leaderboard")]);
    setData({ stats: stats.data, leaderboard: leaderboard.data || [] });
  }, [ctx.donationTick]);
  return (
    <Shell ctx={ctx} title="Badges & points" tabs={tabs}>
      <Card>
        <Text style={styles.statLabel}>Points balance</Text>
        <Text style={styles.heroPoints}>{data.stats?.points || 0}</Text>
        <Text style={styles.body}>Total donations: {data.stats?.totalDonations || 0}</Text>
      </Card>
      <View style={styles.grid}>
        {allBadges.map((badge) => (
          <View key={badge} style={[styles.badgeTile, data.stats?.badges?.includes(badge) ? styles.badgeEarned : styles.badgeLocked]}>
            <Text style={styles.badgeTitle}>{badge}</Text>
            <Text style={styles.muted}>{data.stats?.badges?.includes(badge) ? "EARNED" : "Locked"}</Text>
          </View>
        ))}
      </View>
      <List
        data={data.stats?.records || []}
        empty="No loyalty activity yet."
        renderItem={(item) => <Card><Text style={styles.cardTitle}>{titleCase(item.action)}</Text><Text>+{item.points} | {item.description}</Text></Card>}
      />
      <Text style={styles.sectionTitle}>Leaderboard</Text>
      <List
        data={data.leaderboard}
        empty="No leaderboard data yet."
        renderItem={(item, index) => (
          <Card>
            <Text style={styles.cardTitle}>#{index + 1} {item.firstName} {item.lastName}</Text>
            <Text>{item.bloodGroup} | {item.points} points | {item.totalDonations} donations</Text>
          </Card>
        )}
      />
    </Shell>
  );
}

function NotificationsScreen({ ctx, tabs }) {
  const [items, setItems] = useState([]);
  const load = async () => setItems((await ctx.api("/notifications")).data || []);
  useLoader(ctx, load);
  const respond = async (requestId, action) => {
    try {
      const data = await ctx.api(`/blood-requests/${requestId}/respond`, { method: "PUT", body: { action } });
      if (action === "accept") ctx.setRoute(`chat:${requestId}`);
      else Alert.alert("Saved", data.message || "Response saved.");
      load();
    } catch (err) {
      Alert.alert("Response failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Notifications" tabs={tabs}>
      <List
        data={items}
        empty="You're all caught up. No new notifications."
        renderItem={(item) => <NotificationCard item={item} ctx={ctx} respond={respond} />}
      />
    </Shell>
  );
}

function NearbyRequestsScreen({ ctx, tabs }) {
  const [items, setItems] = useState([]);
  const load = async () => {
    const coords = ctx.user.location?.coordinates;
    if (!coords?.length) return;
    setItems((await ctx.api(`/blood-requests/nearby?lat=${coords[1]}&lng=${coords[0]}`)).data || []);
  };
  useLoader(ctx, load);
  const accept = async (id) => {
    try {
      await ctx.api(`/blood-requests/${id}/respond`, { method: "PUT", body: { action: "accept" } });
      ctx.setRoute(`chat:${id}`);
    } catch (err) {
      Alert.alert("Accept failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Nearby requests" tabs={tabs}>
      <Button label="Update location" tone="outline" onPress={() => updateLocation(ctx).then(load)} />
      <List data={items} empty="No blood requests near you right now. You'll be notified when someone needs help." renderItem={(item) => <RequestCard item={item} onAccept={item.status === "open" ? () => accept(item._id) : undefined} />} />
    </Shell>
  );
}

function RaiseRequestScreen({ ctx, tabs, donorSos = false }) {
  const [form, setField] = useForm({ bloodGroup: "O+", urgency: "normal", unitsNeeded: "1", radiusKm: "10", notes: "" });
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(null);
  const coords = ctx.user.location?.coordinates;
  const refreshCount = async () => {
    if (!coords?.length) return;
    const query = new URLSearchParams({ bloodGroup: form.bloodGroup, radius: form.radiusKm, lat: String(coords[1]), lng: String(coords[0]) });
    setCount(((await ctx.api(`/donors/count?${query}`)).data || {}).count || 0);
  };
  useEffect(() => { refreshCount().catch(() => {}); }, [form.bloodGroup, form.radiusKm, ctx.user.location]);
  useEffect(() => {
    const socket = ctx.socket;
    if (!socket || !active?._id) return undefined;
    const sync = async () => {
      try {
        const data = await ctx.api("/blood-requests");
        const updated = (data.data || []).find((item) => item._id === active._id);
        if (updated) setActive(updated);
      } catch {
        // Keep last known request state.
      }
    };
    socket.on("blood-request:response", sync);
    return () => socket.off("blood-request:response", sync);
  }, [ctx.socket, active?._id]);
  const submit = async () => {
    try {
      const body = { ...form, unitsNeeded: Number(form.unitsNeeded), radiusKm: Number(form.radiusKm), lat: coords?.[1], lng: coords?.[0] };
      const data = await ctx.api("/blood-requests", { method: "POST", body });
      setActive(data.data.request);
      Alert.alert("Request sent", `Notified ${data.data.notifiedDonors} donors.`);
    } catch (err) {
      Alert.alert("Request failed", err.message);
    }
  };
  const cancel = async () => {
    try {
      const data = await ctx.api(`/blood-requests/${active._id}/status`, { method: "PUT", body: { status: "cancelled" } });
      setActive(data.data);
      Alert.alert("Cancelled");
    } catch (err) {
      Alert.alert("Cancel failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title={donorSos ? "Emergency SOS" : "Raise blood request"} tabs={tabs}>
      {!coords?.length ? <Card><Text style={styles.body}>Update your location before sending a request.</Text><Button label="Update location" onPress={() => updateLocation(ctx)} /></Card> : null}
      <Card>
        <PickerRow label="Blood group" value={form.bloodGroup} options={BLOOD_GROUPS} onChange={(v) => setField("bloodGroup", v)} />
        <PickerRow label="Urgency" value={form.urgency} options={["normal", "urgent", "critical"]} onChange={(v) => setField("urgency", v)} />
        <Input label="Units needed" value={form.unitsNeeded} onChangeText={(v) => setField("unitsNeeded", v)} keyboardType="numeric" />
        <Input label="Radius km" value={form.radiusKm} onChangeText={(v) => setField("radiusKm", v)} keyboardType="numeric" />
        <Input label="Notes" value={form.notes} onChangeText={(v) => setField("notes", v)} multiline />
        <Text style={styles.body}>{count} eligible donors found in this area</Text>
        {count === 0 && Number(form.radiusKm) < 50 ? <Text style={styles.warn}>Try increasing the radius.</Text> : null}
        {count === 0 && Number(form.radiusKm) >= 50 ? <Text style={styles.danger}>Contact hospitals directly.</Text> : null}
        <Button label={donorSos ? "Raise emergency SOS" : "Request blood"} onPress={submit} />
        {donorSos && active?.status === "open" ? <Button label="Cancel request" tone="outline" onPress={cancel} /> : null}
      </Card>
    </Shell>
  );
}

const hospitalTabs = [
  ["Dashboard", "hospital:dashboard"],
  ["Inventory", "hospital:inventory"],
  ["Raise", "hospital:raise"],
  ["Requests", "hospital:requests"],
  ["Donor search", "hospital:donorSearch"],
  ["Appointments", "hospital:appointments"],
  ["Expiry", "hospital:expiry"],
  ["Profile", "hospital:profile"],
  ["Notifications", "hospital:notifications"],
].map(([label, route]) => ({ label, route }));

function HospitalApp({ ctx }) {
  const route = ctx.route.startsWith("hospital:") ? ctx.route : "hospital:dashboard";
  const props = { ctx, tabs: hospitalTabs };
  if (ctx.user.isApproved === false) return <PendingApproval ctx={ctx} tabs={hospitalTabs} />;
  if (route === "hospital:inventory") return <InventoryScreen {...props} />;
  if (route === "hospital:raise") return <RaiseRequestScreen {...props} />;
  if (route === "hospital:requests") return <RequestsScreen {...props} />;
  if (route === "hospital:donorSearch") return <DonorSearchScreen {...props} />;
  if (route === "hospital:appointments") return <HospitalAppointmentsScreen {...props} />;
  if (route === "hospital:expiry") return <ExpiryScreen {...props} />;
  if (route === "hospital:profile") return <HospitalProfile {...props} />;
  if (route === "hospital:notifications") return <NotificationsScreen {...props} />;
  return <HospitalDashboard {...props} />;
}

function PendingApproval({ ctx, tabs }) {
  return (
    <Shell ctx={ctx} title="Pending approval" tabs={tabs}>
      <Card>
        <Text style={styles.cardTitle}>Your account is pending admin approval.</Text>
        <Text style={styles.body}>You'll receive a notification once approved.</Text>
      </Card>
    </Shell>
  );
}

function HospitalDashboard({ ctx, tabs }) {
  const [data, setData] = useState({ inventory: [], requests: [], expiry: [] });
  useLoader(ctx, async () => {
    const [inventory, requests, expiry] = await Promise.all([ctx.api("/inventory"), ctx.api("/blood-requests"), ctx.api("/inventory/expiry-alerts")]);
    setData({ inventory: inventory.data || [], requests: requests.data || [], expiry: expiry.data || [] });
  });
  const totals = BLOOD_GROUPS.map((group) => ({
    group,
    units: data.inventory.filter((i) => i.bloodGroup === group).reduce((sum, item) => sum + Number(item.units || 0), 0),
  }));
  return (
    <Shell ctx={ctx} title="Hospital dashboard" tabs={tabs}>
      {ctx.user.isActive === false ? <Card danger><Text>Your account has been suspended. Reason: {ctx.user.suspensionReason || "No reason provided"}. Contact support.</Text></Card> : null}
      <View style={styles.grid}>{totals.map((item) => <Stat key={item.group} label={item.group} value={item.units} />)}</View>
      <View style={styles.grid}>
        <Stat label="Open requests" value={data.requests.filter((r) => r.status === "open").length} />
        <Stat label="Fulfilled" value={data.requests.filter((r) => r.status === "fulfilled").length} />
        <Stat label="Expiry alerts" value={data.expiry.length} />
      </View>
    </Shell>
  );
}

function InventoryScreen({ ctx, tabs }) {
  const [items, setItems] = useState([]);
  const [form, setField, setForm] = useForm({ bloodGroup: "O+", units: "1", expiryDate: "" });
  const load = async () => setItems((await ctx.api("/inventory")).data || []);
  useLoader(ctx, load);
  const save = async () => {
    try {
      await ctx.api("/inventory", { method: "POST", body: { ...form, units: Number(form.units) } });
      setForm({ bloodGroup: "O+", units: "1", expiryDate: "" });
      load();
    } catch (err) {
      Alert.alert("Inventory failed", err.message);
    }
  };
  const del = async (id) => {
    await ctx.api(`/inventory/${id}`, { method: "DELETE" });
    load();
  };
  return (
    <Shell ctx={ctx} title="Inventory" tabs={tabs}>
      <Card>
        <PickerRow label="Blood group" value={form.bloodGroup} options={BLOOD_GROUPS} onChange={(v) => setField("bloodGroup", v)} />
        <Input label="Units" value={form.units} onChangeText={(v) => setField("units", v)} keyboardType="numeric" />
        <Input label="Expiry YYYY-MM-DD" value={form.expiryDate} onChangeText={(v) => setField("expiryDate", v)} />
        <Button label="Add stock" onPress={save} />
      </Card>
      <List data={items} empty="No stock yet." renderItem={(item) => <Card><Text style={styles.cardTitle}>{item.bloodGroup}</Text><Text>{item.units} units | Expiry {fmtDate(item.expiryDate)}</Text><Button label="Delete" tone="outline" onPress={() => del(item._id)} /></Card>} />
    </Shell>
  );
}

function RequestsScreen({ ctx, tabs, admin = false }) {
  const [items, setItems] = useState([]);
  const endpoint = admin ? "/admin/requests" : "/blood-requests";
  const load = async () => setItems((await ctx.api(endpoint)).data || []);
  useLoader(ctx, load);
  const status = async (id, next) => {
    try {
      await ctx.api(`/blood-requests/${id}/status`, { method: "PUT", body: { status: next } });
      load();
    } catch (err) {
      Alert.alert("Status failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title={admin ? "Requests log" : "Request status"} tabs={tabs}>
      <List data={items} empty="No requests yet." renderItem={(item) => <RequestStatusCard item={item} ctx={ctx} admin={admin} status={status} />} />
    </Shell>
  );
}

function DonorSearchScreen({ ctx, tabs }) {
  return <PublicSearchScreen ctx={{ ...ctx, route: ctx.route }} tabs={tabs} />;
}

function HospitalAppointmentsScreen({ ctx, tabs }) {
  const [items, setItems] = useState([]);
  const load = async () => setItems((await ctx.api("/appointments")).data || []);
  useLoader(ctx, load);
  const complete = async (id) => {
    try {
      const data = await ctx.api(`/appointments/${id}/complete`, { method: "PUT" });
      const loyalty = data.data?.loyalty;
      Alert.alert("Donation recorded", loyalty ? `Donor earned +${loyalty.pointsAwarded} points.` : "Appointment completed.");
      load();
    } catch (err) {
      Alert.alert("Record failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Appointments" tabs={tabs}>
      <List
        data={items}
        empty="No appointments yet."
        renderItem={(item) => (
          <Card>
            <Text style={styles.cardTitle}>{item.donor?.firstName} {item.donor?.lastName}</Text>
            <Text>{item.donor?.bloodGroup} | {fmtDate(item.date)} | {item.timeSlot}</Text>
            <Text>{titleCase(item.status)}</Text>
            {item.status === "scheduled" ? <Button label="Mark donated" onPress={() => complete(item._id)} /> : null}
          </Card>
        )}
      />
    </Shell>
  );
}

function ExpiryScreen({ ctx, tabs }) {
  const [items, setItems] = useState([]);
  useLoader(ctx, async () => setItems((await ctx.api("/inventory/expiry-alerts")).data || []));
  return (
    <Shell ctx={ctx} title="Expiry alerts" tabs={tabs}>
      <List data={items} empty="No expiring stock." renderItem={(item) => <Card><Text style={styles.cardTitle}>{item.bloodGroup}</Text><Text>{item.units} units | Expiry {fmtDate(item.expiryDate)}</Text></Card>} />
    </Shell>
  );
}

function HospitalProfile({ ctx, tabs }) {
  const [form, setField] = useForm({
    hospitalName: ctx.user.hospitalName || ctx.user.firstName || "",
    address: ctx.user.address || "",
    city: ctx.user.city || "",
    pincode: ctx.user.pincode || "",
    phoneNumber: ctx.user.phoneNumber || "",
    licenseNumber: ctx.user.licenseNumber || ctx.user.registrationNumber || "",
  });
  const save = async () => {
    try {
      const data = await ctx.api("/auth/me", { method: "PUT", body: form });
      ctx.setUser(data.data);
      Alert.alert("Saved", "Hospital profile updated.");
    } catch (err) {
      Alert.alert("Profile failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Hospital profile" tabs={tabs}>
      <Card>
        <Input label="Hospital name" value={form.hospitalName} onChangeText={(v) => setField("hospitalName", v)} />
        <Input label="Phone" value={form.phoneNumber} onChangeText={(v) => setField("phoneNumber", v)} />
        <Input label="City" value={form.city} onChangeText={(v) => setField("city", v)} />
        <Input label="Pincode" value={form.pincode} onChangeText={(v) => setField("pincode", v)} />
        <Input label="License number" value={form.licenseNumber} onChangeText={(v) => setField("licenseNumber", v)} />
        <Input label="Address" value={form.address} onChangeText={(v) => setField("address", v)} multiline />
        <Button label="Save profile" onPress={save} />
      </Card>
    </Shell>
  );
}

const adminTabs = [
  ["Dashboard", "admin:dashboard"],
  ["Users", "admin:users"],
  ["Inventory", "admin:inventory"],
  ["Requests", "admin:requests"],
  ["Analytics", "admin:analytics"],
  ["Broadcast", "admin:broadcast"],
  ["Settings", "admin:settings"],
  ["Reports", "admin:reports"],
].map(([label, route]) => ({ label, route }));

function AdminApp({ ctx }) {
  const route = ctx.route.startsWith("admin:") ? ctx.route : "admin:dashboard";
  const props = { ctx, tabs: adminTabs };
  if (route === "admin:users") return <UserManagementScreen {...props} />;
  if (route === "admin:inventory") return <AdminInventoryScreen {...props} />;
  if (route === "admin:requests") return <RequestsScreen {...props} admin />;
  if (route === "admin:analytics") return <AnalyticsScreen {...props} />;
  if (route === "admin:broadcast") return <BroadcastScreen {...props} />;
  if (route === "admin:settings") return <SettingsScreen {...props} />;
  if (route === "admin:reports") return <ReportsScreen {...props} />;
  return <AdminDashboardScreen {...props} />;
}

function AdminDashboardScreen({ ctx, tabs }) {
  const [data, setData] = useState(null);
  useLoader(ctx, async () => {
    const [stats, analytics, inventory] = await Promise.all([ctx.api("/admin/stats"), ctx.api("/admin/analytics"), ctx.api("/admin/inventory")]);
    setData({ stats: stats.data, analytics: analytics.data, inventory: inventory.data });
  });
  return (
    <Shell ctx={ctx} title="Admin dashboard" tabs={tabs}>
      <View style={styles.grid}>{["totalUsers", "totalDonors", "totalHospitals", "totalBloodUnits", "requestsToday", "fulfilledToday", "pendingHospitalApprovals"].map((key) => <Stat key={key} label={titleCase(key)} value={data?.stats?.[key] || 0} />)}</View>
      <List
        data={data?.inventory?.critical || []}
        empty="No critical shortages."
        renderItem={(item) => (
          <Card danger>
            <Text style={styles.cardTitle}>{item.bloodGroup} shortage</Text>
            <Button label="Broadcast Alert" tone="outline" onPress={() => ctx.setRoute(`admin:broadcast:${item.bloodGroup}`)} />
          </Card>
        )}
      />
    </Shell>
  );
}

function UserManagementScreen({ ctx, tabs }) {
  const [role, setRole] = useState("");
  const [items, setItems] = useState([]);
  const [suspending, setSuspending] = useState(null);
  const [reason, setReason] = useState("");
  const load = async () => setItems((await ctx.api(`/admin/users?role=${role}`)).data || []);
  useLoader(ctx, load, [role]);
  const action = async (id, name, body = {}) => {
    await ctx.api(`/admin/users/${id}/${name}`, { method: "PUT", body });
    setSuspending(null);
    setReason("");
    load();
  };
  return (
    <Shell ctx={ctx} title="User management" tabs={tabs}>
      <PickerRow label="Role filter" value={role} options={["", "donor", "hospital", "organization", "admin"]} labels={{ "": "All" }} onChange={setRole} />
      <List data={items} empty="No users found." renderItem={(u) => (
        <Card>
          <Text style={styles.cardTitle}>{u.firstName} {u.lastName}</Text>
          <Text>{u.email} | {u.role}</Text>
          <Text>{u.isActive ? "Active" : "Suspended"} {u.role === "hospital" && !u.isApproved ? "/ Pending" : ""}</Text>
          <View style={styles.row}>
            {u.role === "hospital" && !u.isApproved ? <Button label="Approve" tone="outline" onPress={() => action(u._id, "approve")} /> : null}
            <Button label={u.isActive ? "Suspend" : "Activate"} tone="outline" onPress={() => u.isActive ? setSuspending(u) : action(u._id, "activate")} />
          </View>
        </Card>
      )} />
      <Modal visible={Boolean(suspending)} transparent animationType="fade">
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Suspend user</Text>
            <Input label="Reason" value={reason} onChangeText={setReason} multiline />
            <View style={styles.row}>
              <Button label="Cancel" tone="outline" onPress={() => setSuspending(null)} />
              <Button label="Suspend" onPress={() => action(suspending._id, "suspend", { reason })} />
            </View>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}

function AdminInventoryScreen({ ctx, tabs }) {
  const [data, setData] = useState(null);
  useLoader(ctx, async () => setData((await ctx.api("/admin/inventory")).data));
  return (
    <Shell ctx={ctx} title="Inventory overview" tabs={tabs}>
      <List data={data?.byBloodGroup || []} empty="No inventory." renderItem={(item) => <Stat label={item._id} value={item.totalUnits} />} />
    </Shell>
  );
}

function AnalyticsScreen({ ctx, tabs }) {
  const [data, setData] = useState(null);
  useLoader(ctx, async () => setData((await ctx.api("/admin/analytics")).data));
  return (
    <Shell ctx={ctx} title="Analytics" tabs={tabs}>
      <View style={styles.grid}>
        <Stat label="Returning donors" value={data?.retentionRate?.returning || 0} />
        <Stat label="One time donors" value={data?.retentionRate?.oneTime || 0} />
      </View>
      <List data={data?.topDonors || []} empty="No top donors yet." renderItem={(u) => <Card><Text style={styles.cardTitle}>{u.firstName} {u.lastName}</Text><Text>{u.bloodGroup} | {u.points} points | {u.totalDonations} donations</Text></Card>} />
    </Shell>
  );
}

function BroadcastScreen({ ctx, tabs }) {
  const prefill = ctx.route.startsWith("admin:broadcast:") ? ctx.route.split(":")[2] : "";
  const [form, setField] = useForm({
    targetRole: prefill ? "donor" : "",
    targetBloodGroup: prefill,
    title: prefill ? `${prefill} blood urgently needed` : "",
    message: prefill ? `BloodLink has a critical shortage of ${prefill}. Please donate if you are eligible.` : "",
  });
  const send = async () => {
    try {
      const data = await ctx.api("/admin/broadcast", { method: "POST", body: form });
      Alert.alert("Broadcast sent", data.message || "Done");
    } catch (err) {
      Alert.alert("Broadcast failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Broadcast alerts" tabs={tabs}>
      <Card>
        <PickerRow label="Target role" value={form.targetRole} options={["", "donor", "hospital"]} labels={{ "": "All users" }} onChange={(v) => setField("targetRole", v)} />
        <PickerRow label="Blood group" value={form.targetBloodGroup} options={["", ...BLOOD_GROUPS]} labels={{ "": "Any" }} onChange={(v) => setField("targetBloodGroup", v)} />
        <Input label="Title" value={form.title} onChangeText={(v) => setField("title", v)} />
        <Input label="Message" value={form.message} onChangeText={(v) => setField("message", v)} multiline />
        <Button label="Send broadcast" onPress={send} />
      </Card>
    </Shell>
  );
}

function SettingsScreen({ ctx, tabs }) {
  const [form, setField] = useForm({ radius: "10", expiry: "14", escalation: "30" });
  return (
    <Shell ctx={ctx} title="System settings" tabs={tabs}>
      <Card>
        <Input label="Default radius" value={form.radius} onChangeText={(v) => setField("radius", v)} />
        <Input label="Expiry alert days" value={form.expiry} onChangeText={(v) => setField("expiry", v)} />
        <Input label="Escalation minutes" value={form.escalation} onChangeText={(v) => setField("escalation", v)} />
        <Button label="Save" onPress={() => Alert.alert("Saved", "Mobile settings saved locally for this session.")} />
      </Card>
    </Shell>
  );
}

function ReportsScreen({ ctx, tabs }) {
  return (
    <Shell ctx={ctx} title="Reports" tabs={tabs}>
      <Card>
        <Button label="Generate report" onPress={() => Alert.alert("Report generated")} />
        <Button label="Export CSV" tone="outline" onPress={() => Alert.alert("Export ready", "CSV export is available in the web app download flow.")} />
      </Card>
    </Shell>
  );
}

function ChatScreen({ ctx, requestId }) {
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState("");
  const load = async () => setConversation((await ctx.api(`/chats/${requestId}`)).data);
  useLoader(ctx, load, [requestId]);
  useEffect(() => {
    const socket = ctx.socket;
    if (!socket || !requestId) return undefined;
    socket.emit("request:join", requestId);
    const onMessage = ({ requestId: incomingRequestId, message: incoming }) => {
      if (String(incomingRequestId) !== String(requestId)) return;
      setConversation((current) => current ? { ...current, messages: [...(current.messages || []), incoming] } : current);
    };
    socket.on("chat:message", onMessage);
    return () => socket.off("chat:message", onMessage);
  }, [ctx.socket, requestId]);
  const requesterId = conversation?.requester?._id || conversation?.requester;
  const isRequester = String(requesterId) === String(ctx.user._id);
  const other = isRequester ? conversation?.donor : conversation?.requester;
  const send = async () => {
    if (!message.trim()) return;
    try {
      await ctx.api(`/chats/${requestId}/messages`, { method: "POST", body: { message } });
      setMessage("");
    } catch (err) {
      Alert.alert("Message failed", err.message);
    }
  };
  const complete = async () => {
    try {
      const data = await ctx.api(`/blood-requests/${requestId}/complete-donation`, { method: "PUT" });
      const loyalty = data.data?.loyalty;
      setConversation((current) => ({ ...current, request: data.data.request }));
      Alert.alert(
        "Donation recorded",
        loyalty
          ? `+${loyalty.pointsAwarded} points. Total donations: ${loyalty.totalDonations}. Badges: ${(loyalty.badges || []).join(", ") || "none yet"}.`
          : "Donor deferred for 30 days.",
      );
    } catch (err) {
      Alert.alert("Complete failed", err.message);
    }
  };
  const reopen = async () => {
    try {
      const data = await ctx.api(`/blood-requests/${requestId}/status`, { method: "PUT", body: { status: "open" } });
      setConversation((current) => ({ ...current, request: data.data }));
      Alert.alert("Request reopened");
    } catch (err) {
      Alert.alert("Reopen failed", err.message);
    }
  };
  return (
    <Shell ctx={ctx} title="Request chat">
      {!conversation ? <ActivityIndicator /> : (
        <>
          <Card>
            <Text style={styles.cardTitle}>{conversation.request?.bloodGroup} blood | {conversation.request?.unitsNeeded} unit(s)</Text>
            <Text>{other?.firstName || other?.hospitalName || "Participant"} | {other?.phoneNumber || "Phone not shared"}</Text>
            {isRequester && conversation.request?.status === "responding" ? <Button label="Mark donation completed" onPress={complete} /> : null}
            {isRequester && conversation.request?.status === "responding" ? <Button label="Donor didn't show up" tone="outline" onPress={reopen} /> : null}
          </Card>
          <List data={conversation.messages || []} empty="No messages yet." renderItem={(item) => <Card><Text style={String(item.sender?._id || item.sender) === String(ctx.user._id) ? styles.mine : styles.body}>{item.message}</Text></Card>} />
          <Card>
            <Input label="Message" value={message} onChangeText={setMessage} />
            <Button label="Send" onPress={send} />
          </Card>
        </>
      )}
    </Shell>
  );
}

function useLoader(ctx, loader, deps = []) {
  useEffect(() => {
    let active = true;
    loader().catch((err) => {
      if (active) Alert.alert("Load failed", err.message);
    });
    return () => { active = false; };
  }, [ctx.api, ...deps]);
}

async function updateLocation(ctx) {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") throw new Error("Location permission denied");
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const data = await ctx.api("/donors/location", {
      method: "PUT",
      body: { lat: position.coords.latitude, lng: position.coords.longitude },
    });
    ctx.setUser(data.data);
    Alert.alert("Location updated");
  } catch (err) {
    Alert.alert("Location failed", err.message);
  }
}

function DeferredBanner({ eligibility }) {
  return eligibility?.deferralUntil ? <Card warning><Text>You are deferred for 30 days after your last donation.</Text></Card> : null;
}

function NotificationCard({ item, ctx, respond }) {
  const requestId = item.data?.requestId;
  return (
    <Card>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.body}>{item.message}</Text>
      {item.type === "blood_request" && requestId && !item.data?.closed && respond ? (
        <View style={styles.row}>
          <Button label="Accept" onPress={() => respond(requestId, "accept")} />
          <Button label="Decline" tone="outline" onPress={() => respond(requestId, "decline")} />
        </View>
      ) : null}
      {(item.type === "donor_response" || item.data?.response === "accept") && requestId ? <Button label="Open chat" tone="outline" onPress={() => ctx.setRoute(`chat:${requestId}`)} /> : null}
    </Card>
  );
}

function BloodGroupPill({ group }) {
  return (
    <View style={styles.bloodPill}>
      <Text style={styles.bloodPillText}>{group}</Text>
    </View>
  );
}

function RequestCard({ item, onAccept }) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <BloodGroupPill group={item.bloodGroup} />
        <Text style={item.urgency === "critical" ? styles.danger : item.urgency === "urgent" ? styles.warn : styles.body}>{titleCase(item.urgency)}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.unitsNeeded} unit(s) needed</Text>
      <Text>{item.requestedBy?.firstName || "Requester"} | {titleCase(item.status)}</Text>
      {onAccept ? <Button label="Accept request" onPress={onAccept} /> : null}
    </Card>
  );
}

function RequestStatusCard({ item, ctx, admin, status }) {
  const acceptedDonor = item.acceptedDonor || item.respondingDonors?.find((entry) => entry.action === "accept")?.donor;
  return (
    <Card>
      <Text style={styles.cardTitle}>{item.bloodGroup} | {item.unitsNeeded} unit(s)</Text>
      <Text>{titleCase(item.urgency)} | {titleCase(item.status)} | Notified {item.notifiedDonors?.length || 0}</Text>
      <View style={styles.row}>
        {!admin && acceptedDonor ? <Button label="Chat" tone="outline" onPress={() => ctx.setRoute(`chat:${item._id}`)} /> : null}
        {!admin && item.status === "responding" ? <Button label="Mark fulfilled" tone="outline" onPress={() => status(item._id, "fulfilled")} /> : null}
      </View>
    </Card>
  );
}

function DonorCard({ donor }) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>{donor.firstName || "Donor"}</Text>
        <BloodGroupPill group={donor.bloodGroup} />
      </View>
      <Text>{donor.city || "City not shared"}</Text>
    </Card>
  );
}

function List({ data = [], empty, renderItem }) {
  if (!data.length) return <Card><Text style={styles.muted}>{empty}</Text></Card>;
  return <>{data.map((item, index) => <View key={item._id || item.id || `${index}`}>{renderItem(item, index)}</View>)}</>;
}

function Card({ children, warning, danger }) {
  return <View style={[styles.card, warning && styles.warningCard, danger && styles.dangerCard]}>{children}</View>;
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Button({ label, onPress, tone = "primary" }) {
  return (
    <Pressable style={[styles.button, tone === "outline" && styles.buttonOutline, tone === "ghost" && styles.buttonGhost]} onPress={onPress}>
      <Text style={[styles.buttonText, tone !== "primary" && styles.buttonTextOutline]}>{label}</Text>
    </Pressable>
  );
}

function Input({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, props.multiline && styles.textarea]} placeholderTextColor="#94A3B8" {...props} />
    </View>
  );
}

function PickerRow({ label, value, options, labels = {}, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((option) => (
          <Pressable key={option || "blank"} style={[styles.choice, value === option && styles.choiceActive]} onPress={() => onChange(option)}>
            <Text style={[styles.choiceText, value === option && styles.choiceTextActive]}>{labels[option] || option || "Any"}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Segment({ value, options, onChange }) {
  return <PickerRow label="Role" value={value} options={options} onChange={onChange} />;
}

function Toggle({ label, value, onChange }) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Button label="No" tone={!value ? "primary" : "outline"} onPress={() => onChange(false)} />
        <Button label="Yes" tone={value ? "primary" : "outline"} onPress={() => onChange(true)} />
      </View>
    </View>
  );
}

function LoadingOverlay() {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  screen: { flex: 1 },
  topbar: { padding: 18, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  eyebrow: { color: "#C0392B", fontWeight: "800", fontSize: 12 },
  title: { color: "#0F172A", fontWeight: "900", fontSize: 22, maxWidth: 250 },
  tabs: { maxHeight: 54, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tab: { margin: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#F1F5F9" },
  tabActive: { backgroundColor: "#C0392B" },
  tabText: { color: "#334155", fontWeight: "800" },
  tabTextActive: { color: "#fff" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 8, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 12 },
  warningCard: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  dangerCard: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  hero: { fontSize: 18, lineHeight: 27, fontWeight: "800", color: "#0F172A", marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: "900", color: "#0F172A", marginBottom: 8 },
  body: { color: "#334155", lineHeight: 22 },
  muted: { color: "#64748B", fontWeight: "700", textAlign: "center" },
  warn: { color: "#B45309", fontWeight: "800", marginTop: 4 },
  danger: { color: "#B91C1C", fontWeight: "800", marginTop: 4 },
  mine: { color: "#C0392B", fontWeight: "900" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  stat: { flexGrow: 1, flexBasis: "46%", backgroundColor: "#fff", padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  statLabel: { color: "#64748B", fontWeight: "800", fontSize: 12 },
  statValue: { color: "#C0392B", fontWeight: "900", fontSize: 24, marginTop: 4 },
  field: { marginBottom: 12 },
  label: { fontWeight: "800", color: "#334155", marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#fff", color: "#0F172A" },
  textarea: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
  button: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 8, paddingHorizontal: 14, backgroundColor: "#C0392B", marginTop: 8 },
  buttonOutline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#C0392B" },
  buttonGhost: { backgroundColor: "transparent" },
  buttonText: { color: "#fff", fontWeight: "900" },
  buttonTextOutline: { color: "#C0392B" },
  choice: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: "#F1F5F9", marginRight: 8 },
  choiceActive: { backgroundColor: "#C0392B" },
  choiceText: { color: "#334155", fontWeight: "800" },
  choiceTextActive: { color: "#fff" },
  toggle: { marginBottom: 12 },
  modalShade: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: 18 },
  modalCard: { backgroundColor: "#fff", borderRadius: 8, padding: 16 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.35)" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  heroPoints: { color: "#C0392B", fontWeight: "900", fontSize: 42, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A", marginBottom: 8, marginTop: 4 },
  badgeTile: { flexGrow: 1, flexBasis: "46%", borderRadius: 8, padding: 14, borderWidth: 1, marginBottom: 10 },
  badgeEarned: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  badgeLocked: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", opacity: 0.72 },
  badgeTitle: { fontWeight: "900", color: "#0F172A" },
  bloodPill: { backgroundColor: "#C0392B", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  bloodPillText: { color: "#fff", fontWeight: "900" },
  sosTag: { color: "#B91C1C", fontWeight: "800", marginTop: 6 },
  regularTag: { color: "#15803D", fontWeight: "800", marginTop: 6 },
  appointmentTag: { color: "#1D4ED8", fontWeight: "800", marginTop: 6 },
});

export default App;
