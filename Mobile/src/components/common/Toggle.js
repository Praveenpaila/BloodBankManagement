import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { theme } from "../../styles/theme";

export function Toggle({ label, value, onChange }) {
  return (
    <View style={styles.toggle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Button
          label="No"
          tone={!value ? "primary" : "outline"}
          onPress={() => onChange(false)}
          style={styles.toggleButton}
        />
        <Button
          label="Yes"
          tone={value ? "primary" : "outline"}
          onPress={() => onChange(true)}
          style={styles.toggleButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    marginBottom: 14,
  },
  label: {
    fontWeight: "800",
    color: theme.colors.text,
    fontSize: 14,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  toggleButton: {
    flex: 1,
    marginTop: 0,
  },
});
