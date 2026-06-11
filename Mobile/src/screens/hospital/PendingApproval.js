import React from "react";
import { Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { theme } from "../../styles/theme";

export function PendingApproval({ tabs }) {
  return (
    <Shell title="Pending approval" tabs={tabs}>
      <Card warning>
        <Text style={styles.cardTitle}>
          Your account is pending admin approval.
        </Text>
        <Text style={styles.body}>
          You will receive a notification once your account has been reviewed.
        </Text>
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.warningText,
    marginBottom: 8,
  },
  body: {
    color: theme.colors.warningText,
    lineHeight: 20,
    fontSize: 14,
    fontWeight: "600",
  },
});
export default PendingApproval;
