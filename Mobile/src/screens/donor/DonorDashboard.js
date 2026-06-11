import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Stat } from "../../components/common/Stat";
import { Button } from "../../components/common/Button";
import { List } from "../../components/common/List";
import { DeferredBanner } from "../../components/common/DeferredBanner";
import { NotificationCard } from "../../components/cards/NotificationCard";
import { useAppContext, empty, fmtDate, titleCase } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function DonorDashboard({ tabs }) {
  const ctx = useAppContext();
  const [data, setData] = useState(null);

  const loading = useLoader(ctx, async () => {
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

  const status =
    data?.eligibility?.status ||
    data?.eligibility?.record?.status ||
    "not checked";

  return (
    <Shell title={`Welcome, ${ctx.user.firstName || "Donor"}`} tabs={tabs} loading={loading}>
      <DeferredBanner eligibility={data?.eligibility} />
      <View style={styles.grid}>
        <Stat label="Donations" value={data?.stats?.totalDonations || 0} />
        <Stat label="Points" value={data?.stats?.points || 0} />
        <Stat label="Badges" value={data?.stats?.badges?.length || 0} />
        <Stat
          label="Next eligible"
          value={
            data?.eligibility?.deferralUntil
              ? fmtDate(data.eligibility.deferralUntil)
              : "Now"
          }
        />
      </View>
      <Card warning={status !== "eligible"} success={status === "eligible"}>
        <Text style={styles.cardTitle}>Eligibility Status</Text>
        <Text style={styles.body}>{titleCase(status)}</Text>
        {data?.eligibility?.deferralReason ? (
          <Text style={styles.deferralReason}>
            {data.eligibility.deferralReason}
          </Text>
        ) : null}
        <Button
          label="Check eligibility"
          onPress={() => ctx.setRoute("donor:eligibility")}
          style={styles.checkBtn}
        />
      </Card>
      
      <Text style={styles.sectionTitle}>Recent Notifications</Text>
      <List
        data={(data?.notifications || []).slice(0, 3)}
        empty="No alerts yet."
        renderItem={(item) => <NotificationCard item={item} />}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 8,
  },
  body: {
    color: theme.colors.text,
    lineHeight: 22,
    fontSize: 15,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  deferralReason: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  checkBtn: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginTop: 10,
    marginBottom: 8,
  },
});
export default DonorDashboard;
