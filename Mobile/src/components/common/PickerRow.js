import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { theme } from "../../styles/theme";

export function PickerRow({ label, value, options, labels = {}, onChange }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((option) => (
          <Pressable
            key={option || "blank"}
            style={[
              styles.choice,
              value === option && styles.choiceActive,
            ]}
            onPress={() => onChange(option)}
          >
            <Text
              style={[
                styles.choiceText,
                value === option && styles.choiceTextActive,
              ]}
            >
              {labels[option] || option || "Any"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    fontWeight: "800",
    color: theme.colors.text,
    fontSize: 14,
    marginBottom: 6,
  },
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: theme.radius.button,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  choiceActive: {
    backgroundColor: theme.colors.primary,
  },
  choiceText: {
    color: theme.colors.muted,
    fontWeight: "800",
    fontSize: 14,
  },
  choiceTextActive: {
    color: "#FFFFFF",
  },
});
