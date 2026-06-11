import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { useAppContext, titleCase } from "../../context/AppContext";
import { theme } from "../../styles/theme";

export function RequestStatusCard({ item, admin, status }) {
  const ctx = useAppContext();
  const acceptedDonor =
    item.acceptedDonor ||
    item.respondingDonors?.find((entry) => entry.action === "accept")?.donor;

  return (
    <Card warning={item.status === "open"} success={item.status === "fulfilled"}>
      <Text style={styles.cardTitle}>
        {item.bloodGroup} | {item.unitsNeeded} unit(s)
      </Text>
      <Text style={styles.meta}>
        Urgency: {titleCase(item.urgency)} | Status: {titleCase(item.status)}
      </Text>
      <Text style={styles.metaMuted}>
        Notified: {item.notifiedDonors?.length || 0} donor(s)
      </Text>
      <View style={styles.row}>
        {!admin && acceptedDonor ? (
          <Button
            label="Chat"
            tone="outline"
            onPress={() => ctx.setRoute(`chat:${item._id}`)}
            style={styles.actionBtn}
          />
        ) : null}
        {!admin && item.status === "responding" ? (
          <Button
            label="Mark fulfilled"
            tone="outline"
            onPress={() => status(item._id, "fulfilled")}
            style={styles.actionBtn}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  meta: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "750",
    marginBottom: 2,
  },
  metaMuted: {
    color: theme.colors.muted,
    fontSize: 13,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    marginTop: 0,
    minHeight: 38,
  },
});
