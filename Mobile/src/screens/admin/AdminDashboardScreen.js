import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Stat } from "../../components/common/Stat";
import { Button } from "../../components/common/Button";
import { List } from "../../components/common/List";
import { useAppContext, titleCase } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function AdminDashboardScreen({ tabs }) {
  const ctx = useAppContext();
  const [data, setData] = useState(null);

  const loading = useLoader(ctx, async () => {
    const [stats, analytics, inventory] = await Promise.all([
      ctx.api("/admin/stats"),
      ctx.api("/admin/analytics"),
      ctx.api("/admin/inventory"),
    ]);
    setData({
      stats: stats.data,
      analytics: analytics.data,
      inventory: inventory.data,
    });
  });

  const statKeys = [
    "totalUsers",
    "totalDonors",
    "totalHospitals",
    "totalBloodUnits",
    "requestsToday",
    "fulfilledToday",
    "pendingHospitalApprovals",
  ];

  return (
    <Shell title="Admin dashboard" tabs={tabs} loading={loading}>
      <Text style={styles.sectionTitle}>System Metrics</Text>
      <View style={styles.grid}>
        {statKeys.map((key) => (
          <Stat
            key={key}
            label={titleCase(key)}
            value={data?.stats?.[key] || 0}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Critical Blood Shortages</Text>
      <List
        data={data?.inventory?.critical || []}
        empty="No critical shortages in the system."
        renderItem={(item) => (
          <Card danger>
            <Text style={styles.cardTitle}>{item.bloodGroup} Shortage Alert</Text>
            <Button
              label="Broadcast Alert"
              tone="outline"
              onPress={() => ctx.setRoute(`admin:broadcast:${item.bloodGroup}`)}
              style={styles.broadcastBtn}
            />
          </Card>
        )}
      />
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.dangerText,
    marginBottom: 6,
  },
  broadcastBtn: {
    marginTop: 8,
    minHeight: 38,
  },
});
export default AdminDashboardScreen;
