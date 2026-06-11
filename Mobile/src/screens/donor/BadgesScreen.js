import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { List } from "../../components/common/List";
import { useAppContext, titleCase } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function BadgesScreen({ tabs }) {
  const ctx = useAppContext();
  const [data, setData] = useState({ stats: null, leaderboard: [] });
  
  const allBadges = [
    "First Drop",
    "Life Saver",
    "Blood Hero",
    "Rare Type",
    "Monthly Champion",
    "Emergency Responder",
  ];

  const loading = useLoader(ctx, async () => {
    const [stats, leaderboard] = await Promise.all([
      ctx.api("/loyalty/my-stats"),
      ctx.api("/loyalty/leaderboard"),
    ]);
    setData({ stats: stats.data, leaderboard: leaderboard.data || [] });
  }, [ctx.donationTick]);

  return (
    <Shell title="Badges & points" tabs={tabs} loading={loading}>
      <Card success>
        <Text style={styles.statLabel}>Points balance</Text>
        <Text style={styles.heroPoints}>{data.stats?.points || 0}</Text>
        <Text style={styles.totalDonations}>
          Total donations: {data.stats?.totalDonations || 0}
        </Text>
      </Card>
      
      <Text style={styles.sectionTitle}>Achievement Badges</Text>
      <View style={styles.grid}>
        {allBadges.map((badge) => {
          const isEarned = data.stats?.badges?.includes(badge);
          return (
            <View
              key={badge}
              style={[
                styles.badgeTile,
                isEarned ? styles.badgeEarned : styles.badgeLocked,
              ]}
            >
              <Text style={styles.badgeTitle}>{badge}</Text>
              <Text style={[styles.badgeStatus, isEarned && styles.earnedText]}>
                {isEarned ? "EARNED" : "LOCKED"}
              </Text>
            </View>
          );
        })}
      </View>
      
      <Text style={styles.sectionTitle}>Points Activity</Text>
      <List
        data={data.stats?.records || []}
        empty="No loyalty activity yet."
        renderItem={(item) => (
          <Card style={styles.recordCard}>
            <Text style={styles.recordTitle}>{titleCase(item.action)}</Text>
            <Text style={styles.recordMeta}>
              +{item.points} pts | {item.description}
            </Text>
          </Card>
        )}
      />
      
      <Text style={styles.sectionTitle}>Donor Leaderboard</Text>
      <List
        data={data.leaderboard}
        empty="No leaderboard data yet."
        renderItem={(item, index) => (
          <Card style={item._id === ctx.user?._id ? styles.myLeaderboard : null}>
            <Text style={styles.leaderboardName}>
              #{index + 1} {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.leaderboardMeta}>
              Group: {item.bloodGroup} | Points: {item.points} | Donations: {item.totalDonations}
            </Text>
          </Card>
        )}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  statLabel: {
    color: theme.colors.successText,
    fontWeight: "800",
    fontSize: 13,
    textTransform: "uppercase",
  },
  heroPoints: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 42,
    marginTop: 4,
  },
  totalDonations: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
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
  badgeTile: {
    flexGrow: 1,
    flexBasis: "46%",
    borderRadius: theme.radius.card,
    padding: 14,
    borderWidth: 1,
  },
  badgeEarned: {
    backgroundColor: theme.colors.successBg,
    borderColor: theme.colors.successBorder,
  },
  badgeLocked: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    opacity: 0.7,
  },
  badgeTitle: {
    fontWeight: "900",
    color: theme.colors.text,
    fontSize: 14,
  },
  badgeStatus: {
    color: theme.colors.muted,
    fontWeight: "800",
    fontSize: 12,
    marginTop: 4,
  },
  earnedText: {
    color: theme.colors.successText,
  },
  recordCard: {
    paddingVertical: 12,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.text,
  },
  recordMeta: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.text,
  },
  leaderboardMeta: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  myLeaderboard: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    backgroundColor: "#FEF2F2",
  },
});
export default BadgesScreen;
