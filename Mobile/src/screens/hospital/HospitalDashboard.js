import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Stat } from "../../components/common/Stat";
import { useAppContext, BLOOD_GROUPS } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function HospitalDashboard({ tabs }) {
  const ctx = useAppContext();
  const [data, setData] = useState({ inventory: [], requests: [], expiry: [] });

  const loading = useLoader(ctx, async () => {
    const [inventory, requests, expiry] = await Promise.all([
      ctx.api("/inventory"),
      ctx.api("/blood-requests"),
      ctx.api("/inventory/expiry-alerts"),
    ]);
    setData({
      inventory: inventory.data || [],
      requests: requests.data || [],
      expiry: expiry.data || [],
    });
  });

  const totals = BLOOD_GROUPS.map((group) => ({
    group,
    units: data.inventory
      .filter((i) => i.bloodGroup === group)
      .reduce((sum, item) => sum + Number(item.units || 0), 0),
  }));

  const openReqCount = data.requests.filter((r) => r.status === "open").length;
  const fulfilledReqCount = data.requests.filter((r) => r.status === "fulfilled").length;

  return (
    <Shell title="Hospital dashboard" tabs={tabs} loading={loading}>
      {ctx.user?.isActive === false ? (
        <Card danger>
          <Text style={styles.dangerText}>
            Your account has been suspended. Reason:{" "}
            {ctx.user.suspensionReason || "No reason provided"}. Please contact support.
          </Text>
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Blood Inventory Units</Text>
      <View style={styles.grid}>
        {totals.map((item) => (
          <Stat key={item.group} label={item.group} value={item.units} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Request & Alert Summary</Text>
      <View style={styles.grid}>
        <Stat label="Open Requests" value={openReqCount} />
        <Stat label="Fulfilled" value={fulfilledReqCount} />
        <Stat label="Expiry Alerts" value={data.expiry.length} />
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 10,
    marginTop: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 6,
  },
  dangerText: {
    color: theme.colors.dangerText,
    fontWeight: "800",
    fontSize: 14,
    lineHeight: 20,
  },
});
export default HospitalDashboard;
