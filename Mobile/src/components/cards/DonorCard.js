import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../common/Card";
import { BloodGroupPill } from "../common/BloodGroupPill";
import { theme } from "../../styles/theme";

export function DonorCard({ donor }) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>
          {donor.firstName || "Donor"} {donor.lastName || ""}
        </Text>
        <BloodGroupPill group={donor.bloodGroup} />
      </View>
      <Text style={styles.cityText}>
        City: {donor.city || "Not shared"}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
  },
  cityText: {
    fontSize: 14,
    color: theme.colors.muted,
  },
});
