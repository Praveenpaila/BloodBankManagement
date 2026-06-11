import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { useAppContext } from "../../context/AppContext";
import { theme } from "../../styles/theme";

export function NotificationCard({ item, respond }) {
  const ctx = useAppContext();
  const requestId = item.data?.requestId;

  return (
    <Card warning={!item.isRead}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.body}>{item.message}</Text>
      {item.type === "blood_request" &&
      requestId &&
      !item.data?.closed &&
      respond ? (
        <View style={styles.row}>
          <Button
            label="Accept"
            onPress={() => respond(requestId, "accept")}
            style={styles.actionBtn}
          />
          <Button
            label="Decline"
            tone="outline"
            onPress={() => respond(requestId, "decline")}
            style={styles.actionBtn}
          />
        </View>
      ) : null}
      {(item.type === "donor_response" || item.data?.response === "accept") &&
      requestId ? (
        <Button
          label="Open chat"
          tone="outline"
          onPress={() => ctx.setRoute(`chat:${requestId}`)}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 6,
  },
  body: {
    color: theme.colors.muted,
    lineHeight: 20,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    marginTop: 0,
    minHeight: 38,
  },
});
