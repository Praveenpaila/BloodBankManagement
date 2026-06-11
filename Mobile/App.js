import React from "react";
import { SafeAreaView, View, Text, Modal, StyleSheet } from "react-native";
import { AppProvider, useAppContext } from "./src/context/AppContext";
import { theme } from "./src/styles/theme";

// Common layout/card elements
import { LoadingOverlay } from "./src/components/common/LoadingOverlay";
import { Button } from "./src/components/common/Button";

// Public Screens
import { HomeScreen } from "./src/screens/public/HomeScreen";
import { LoginScreen } from "./src/screens/public/LoginScreen";
import { RegisterScreen } from "./src/screens/public/RegisterScreen";
import { ForgotPasswordScreen } from "./src/screens/public/ForgotPasswordScreen";
import { PublicSearchScreen } from "./src/screens/public/PublicSearchScreen";
import { ContactScreen } from "./src/screens/public/ContactScreen";

// Donor Screens
import { DonorDashboard } from "./src/screens/donor/DonorDashboard";
import { DonorProfile } from "./src/screens/donor/DonorProfile";
import { EligibilityScreen } from "./src/screens/donor/EligibilityScreen";
import { AppointmentScreen } from "./src/screens/donor/AppointmentScreen";
import { DonationHistoryScreen } from "./src/screens/donor/DonationHistoryScreen";
import { BadgesScreen } from "./src/screens/donor/BadgesScreen";
import { NotificationsScreen } from "./src/screens/donor/NotificationsScreen";
import { NearbyRequestsScreen } from "./src/screens/donor/NearbyRequestsScreen";
import { RaiseRequestScreen } from "./src/screens/donor/RaiseRequestScreen";

// Hospital Screens
import { PendingApproval } from "./src/screens/hospital/PendingApproval";
import { HospitalDashboard } from "./src/screens/hospital/HospitalDashboard";
import { InventoryScreen } from "./src/screens/hospital/InventoryScreen";
import { RequestsScreen } from "./src/screens/hospital/RequestsScreen";
import { HospitalAppointmentsScreen } from "./src/screens/hospital/HospitalAppointmentsScreen";
import { ExpiryScreen } from "./src/screens/hospital/ExpiryScreen";
import { HospitalProfile } from "./src/screens/hospital/HospitalProfile";

// Admin Screens
import { AdminDashboardScreen } from "./src/screens/admin/AdminDashboardScreen";
import { UserManagementScreen } from "./src/screens/admin/UserManagementScreen";
import { AdminInventoryScreen } from "./src/screens/admin/AdminInventoryScreen";
import { AnalyticsScreen } from "./src/screens/admin/AnalyticsScreen";
import { BroadcastScreen } from "./src/screens/admin/BroadcastScreen";
import { SettingsScreen } from "./src/screens/admin/SettingsScreen";
import { ReportsScreen } from "./src/screens/admin/ReportsScreen";

// Chat Screen
import { ChatScreen } from "./src/screens/chat/ChatScreen";

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

function AppInner() {
  const {
    user,
    route,
    loading,
    booting,
    activeSos,
    setActiveSos,
    respondToSos
  } = useAppContext();

  if (booting) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingOverlay />
      </SafeAreaView>
    );
  }

  // Resolve screen to show
  let content = null;

  if (!user) {
    // Public Flow
    if (route === "login") content = <LoginScreen />;
    else if (route === "register") content = <RegisterScreen />;
    else if (route === "forgot") content = <ForgotPasswordScreen />;
    else if (route === "publicSearch") content = <PublicSearchScreen />;
    else if (route === "contact") content = <ContactScreen />;
    else content = <HomeScreen />;
  } else {
    // Authenticated Flow
    if (route.startsWith("chat:")) {
      const rId = route.split(":")[1];
      content = <ChatScreen requestId={rId} />;
    } else if (user.role === "donor") {
      // Donor screens
      if (route === "donor:profile") content = <DonorProfile tabs={donorTabs} />;
      else if (route === "donor:eligibility") content = <EligibilityScreen tabs={donorTabs} />;
      else if (route === "donor:appointments") content = <AppointmentScreen tabs={donorTabs} />;
      else if (route === "donor:history") content = <DonationHistoryScreen tabs={donorTabs} />;
      else if (route === "donor:badges") content = <BadgesScreen tabs={donorTabs} />;
      else if (route === "donor:notifications") content = <NotificationsScreen tabs={donorTabs} />;
      else if (route === "donor:nearby") content = <NearbyRequestsScreen tabs={donorTabs} />;
      else if (route === "donor:sos") content = <RaiseRequestScreen tabs={donorTabs} donorSos />;
      else content = <DonorDashboard tabs={donorTabs} />;
    } else if (user.role === "hospital") {
      // Hospital screens
      if (user.isApproved === false) {
        content = <PendingApproval tabs={hospitalTabs} />;
      } else if (route === "hospital:inventory") {
        content = <InventoryScreen tabs={hospitalTabs} />;
      } else if (route === "hospital:raise") {
        content = <RaiseRequestScreen tabs={hospitalTabs} />;
      } else if (route === "hospital:requests") {
        content = <RequestsScreen tabs={hospitalTabs} />;
      } else if (route === "hospital:donorSearch") {
        content = <PublicSearchScreen tabs={hospitalTabs} />;
      } else if (route === "hospital:appointments") {
        content = <HospitalAppointmentsScreen tabs={hospitalTabs} />;
      } else if (route === "hospital:expiry") {
        content = <ExpiryScreen tabs={hospitalTabs} />;
      } else if (route === "hospital:profile") {
        content = <HospitalProfile tabs={hospitalTabs} />;
      } else if (route === "hospital:notifications") {
        content = <NotificationsScreen tabs={hospitalTabs} />;
      } else {
        content = <HospitalDashboard tabs={hospitalTabs} />;
      }
    } else {
      // Admin screens
      if (route === "admin:users") content = <UserManagementScreen tabs={adminTabs} />;
      else if (route === "admin:inventory") content = <AdminInventoryScreen tabs={adminTabs} />;
      else if (route === "admin:requests") content = <RequestsScreen tabs={adminTabs} admin />;
      else if (route === "admin:analytics") content = <AnalyticsScreen tabs={adminTabs} />;
      else if (route === "admin:broadcast") content = <BroadcastScreen tabs={adminTabs} />;
      else if (route === "admin:settings") content = <SettingsScreen tabs={adminTabs} />;
      else if (route === "admin:reports") content = <ReportsScreen tabs={adminTabs} />;
      else content = <AdminDashboardScreen tabs={adminTabs} />;
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {loading && <LoadingOverlay />}
      {content}

      {activeSos ? (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalShade}>
            <View style={styles.modalCard}>
              <Text style={styles.eyebrow}>Emergency SOS nearby</Text>
              <Text style={styles.cardTitle}>{activeSos.title}</Text>
              <Text style={styles.body}>{activeSos.message}</Text>
              <Text style={styles.body}>
                {activeSos.data?.bloodGroup} |{" "}
                {activeSos.data?.distance || "Distance pending"}
              </Text>
              <View style={styles.row}>
                <Button
                  label="Accept"
                  onPress={() => respondToSos("accept")}
                  style={styles.modalBtn}
                />
                <Button
                  label="Decline"
                  tone="outline"
                  onPress={() => respondToSos("decline")}
                  style={styles.modalBtn}
                />
                <Button
                  label="Dismiss"
                  tone="ghost"
                  onPress={() => setActiveSos(null)}
                  style={styles.modalBtn}
                  textStyle={styles.dismissText}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  modalShade: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 16,
    ...theme.shadows.card,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 8,
  },
  body: {
    color: theme.colors.text,
    lineHeight: 20,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    marginTop: 0,
    minHeight: 40,
  },
  dismissText: {
    color: theme.colors.muted,
  },
});
