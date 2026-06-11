import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "./Card";
import { theme } from "../../styles/theme";

export function List({ data = [], empty, renderItem }) {
  if (!data || !data.length) {
    return (
      <Card>
        <Text style={styles.muted}>{empty || "No records found."}</Text>
      </Card>
    );
  }

  return (
    <>
      {data.map((item, index) => (
        <View key={item?._id || item?.id || `${index}`}>
          {renderItem(item, index)}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: theme.colors.muted,
    fontWeight: "700",
    textAlign: "center",
    fontSize: 14,
  },
});
