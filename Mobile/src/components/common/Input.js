import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { theme } from "../../styles/theme";

/**
 * Matches .input-field from index.css:
 *   border: 1px solid #cfd8e6
 *   border-radius: 0.45rem
 *   background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)
 *   padding: 0.75rem 0.85rem
 *
 *  On focus:
 *   border-color: var(--primary)
 *   box-shadow: 0 0 0 4px var(--ring)
 */
export function Input({ label, hint, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          props.multiline && styles.textarea,
          focused && styles.inputFocused,
        ]}
        placeholderTextColor={theme.colors.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    ...theme.type.label,
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,                    // approx 0.75rem padding top+bottom + text
    borderWidth: 1,
    borderColor: theme.colors.borderLight,   // #CFD8E6
    borderRadius: theme.radius.input,
    paddingHorizontal: 14,            // 0.85rem
    paddingVertical: 12,              // 0.75rem
    // RN doesn't support CSS gradient on TextInput bg — use white
    backgroundColor: "#FFFFFF",
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  textarea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    // Simulates `box-shadow: 0 0 0 4px var(--ring)` via shadow props
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: "#FFFFFF",
  },
  hint: {
    ...theme.type.caption,
    color: theme.colors.muted,
    marginTop: 4,
  },
});
