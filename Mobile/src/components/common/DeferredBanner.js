import React from "react";
import { Text, StyleSheet } from "react-native";
import { Card } from "./Card";
import { theme } from "../../styles/theme";

export function DeferredBanner({ eligibility }) {
  if (!eligibility?.deferralUntil) return null;

  return (
    <Card warning>
      <Text style={styles.text}>
        You are deferred for 30 days after your last donation.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  text: {
    color: theme.colors.warningText,
    fontWeight: "800",
    fontSize: 14,
    lineHeight: 20,
  },
});
