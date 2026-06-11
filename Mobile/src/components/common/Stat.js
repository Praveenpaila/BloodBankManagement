import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../styles/theme";

/**
 * Dashboard stat card — matches the website's .page-grid stat cards.
 */
export function Stat({ label, value, accent }) {
  return (
    <View style={[styles.stat, accent && styles.statAccent]}>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    padding: 16,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  statAccent: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
  },
  value: {
    ...theme.type.statValue,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  valueAccent: {
    color: theme.colors.dangerBtn,
  },
  label: {
    ...theme.type.statLabel,
    color: theme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
