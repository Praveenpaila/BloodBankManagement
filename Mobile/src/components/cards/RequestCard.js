import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { BloodGroupPill } from "../common/BloodGroupPill";
import { titleCase } from "../../context/AppContext";
import { theme } from "../../styles/theme";

export function RequestCard({ item, onAccept }) {
  const isUrgent = item.urgency === "urgent";
  const isCritical = item.urgency === "critical";

  return (
    <Card>
      <View style={styles.rowBetween}>
        <BloodGroupPill group={item.bloodGroup} />
        <Text
          style={[
            styles.urgency,
            isCritical && styles.danger,
            isUrgent && styles.warn,
          ]}
        >
          {titleCase(item.urgency)}
        </Text>
      </View>
      <Text style={styles.cardTitle}>{item.unitsNeeded} unit(s) needed</Text>
      <Text style={styles.meta}>
        {item.requestedBy?.firstName || item.requestedBy?.hospitalName || "Requester"} | {titleCase(item.status)}
      </Text>
      {onAccept ? (
        <Button
          label="Accept request"
          onPress={onAccept}
          style={styles.acceptBtn}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  urgency: {
    fontWeight: "900",
    fontSize: 13,
    color: theme.colors.text,
    textTransform: "uppercase",
  },
  danger: {
    color: theme.colors.dangerText,
  },
  warn: {
    color: theme.colors.warningText,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 14,
    marginBottom: 6,
  },
  acceptBtn: {
    marginTop: 10,
  },
});
