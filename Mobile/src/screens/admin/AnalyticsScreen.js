import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Stat } from "../../components/common/Stat";
import { List } from "../../components/common/List";
import { useAppContext } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function AnalyticsScreen({ tabs }) {
  const ctx = useAppContext();
  const [data, setData] = useState(null);

  const loading = useLoader(ctx, async () => {
    const res = await ctx.api("/admin/analytics");
    setData(res.data);
  });

  return (
    <Shell title="Analytics" tabs={tabs} loading={loading}>
      <Text style={styles.sectionTitle}>Donor Retention metrics</Text>
      <View style={styles.grid}>
        <Stat
          label="Returning Donors"
          value={data?.retentionRate?.returning || 0}
        />
        <Stat
          label="One-Time Donors"
          value={data?.retentionRate?.oneTime || 0}
        />
      </View>

      <Text style={styles.sectionTitle}>Top Contributing Donors</Text>
      <List
        data={data?.topDonors || []}
        empty="No donor history logs yet."
        renderItem={(u) => (
          <Card success>
            <Text style={styles.cardTitle}>
              {u.firstName} {u.lastName || ""}
            </Text>
            <Text style={styles.meta}>
              Group: {u.bloodGroup} | Points: {u.points} | Donations: {u.totalDonations}
            </Text>
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
    color: theme.colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: theme.colors.muted,
  },
});
export default AnalyticsScreen;
