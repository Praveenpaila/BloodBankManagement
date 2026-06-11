import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../../styles/theme";

/**
 * Matches .card from index.css:
 *   background: rgba(255,255,255,0.96)
 *   border: 1px solid var(--border)
 *   border-radius: 0.5rem
 *   padding: 1.25rem
 *   box-shadow: 0 14px 34px rgba(15,23,42,0.07)
 */
export function Card({ children, warning, danger, success, info, style }) {
  return (
    <View
      style={[
        styles.card,
        warning && styles.warning,
        danger  && styles.danger,
        success && styles.success,
        info    && styles.info,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",  // matches website exactly
    borderColor:  theme.colors.border,
    borderWidth:  1,
    borderRadius: theme.radius.card,
    padding:      20,            // 1.25rem
    marginBottom: 12,
    ...theme.shadows.card,
  },
  warning: {
    backgroundColor: theme.colors.warningBg,
    borderColor:     theme.colors.warningBorder,
  },
  danger: {
    backgroundColor: theme.colors.dangerBg,
    borderColor:     theme.colors.dangerBorder,
  },
  success: {
    backgroundColor: theme.colors.successBg,
    borderColor:     theme.colors.successBorder,
  },
  info: {
    backgroundColor: theme.colors.infoBg,
    borderColor:     theme.colors.infoBorder,
  },
});
