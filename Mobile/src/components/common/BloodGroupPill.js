import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../styles/theme";

export function BloodGroupPill({ group }) {
  return (
    <View style={styles.bloodPill}>
      <Text style={styles.bloodPillText}>{group}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bloodPill: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.round,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bloodPillText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },
});
