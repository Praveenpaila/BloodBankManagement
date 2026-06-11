import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export function LoadingOverlay() {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator color="#FFFFFF" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.35)",
  },
});
