import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { List } from "../../components/common/List";
import { useAppContext } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function ChatScreen({ requestId }) {
  const ctx = useAppContext();
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await ctx.api(`/chats/${requestId}`);
    setConversation(res.data);
  };

  const loading = useLoader(ctx, load, [requestId]);

  useEffect(() => {
    const socket = ctx.socket;
    if (!socket || !requestId) return undefined;
    
    socket.emit("request:join", requestId);
    
    const onMessage = ({ requestId: incomingRequestId, message: incoming }) => {
      if (String(incomingRequestId) !== String(requestId)) return;
      setConversation((current) =>
        current
          ? { ...current, messages: [...(current.messages || []), incoming] }
          : current
      );
    };
    
    socket.on("chat:message", onMessage);
    return () => socket.off("chat:message", onMessage);
  }, [ctx.socket, requestId]);

  const requesterId = conversation?.requester?._id || conversation?.requester;
  const isRequester = String(requesterId) === String(ctx.user?._id);
  const other = isRequester ? conversation?.donor : conversation?.requester;

  const send = async () => {
    if (!message.trim()) return;
    try {
      await ctx.api(`/chats/${requestId}/messages`, {
        method: "POST",
        body: { message },
      });
      setMessage("");
    } catch (err) {
      Alert.alert("Message failed", err.message);
    }
  };

  const complete = async () => {
    try {
      const data = await ctx.api(
        `/blood-requests/${requestId}/complete-donation`,
        { method: "PUT" }
      );
      const loyalty = data.data?.loyalty;
      setConversation((current) => ({
        ...current,
        request: data.data.request,
      }));
      Alert.alert(
        "Donation recorded",
        loyalty
          ? `+${loyalty.pointsAwarded} points. Total donations: ${loyalty.totalDonations}. Badges: ${(loyalty.badges || []).join(", ") || "none yet"}.`
          : "Donor deferred for 30 days."
      );
    } catch (err) {
      Alert.alert("Complete failed", err.message);
    }
  };

  const reopen = async () => {
    try {
      const data = await ctx.api(`/blood-requests/${requestId}/status`, {
        method: "PUT",
        body: { status: "open" },
      });
      setConversation((current) => ({ ...current, request: data.data }));
      Alert.alert("Request reopened");
    } catch (err) {
      Alert.alert("Reopen failed", err.message);
    }
  };

  return (
    <Shell title="Request chat" loading={loading}>
      <Card success={conversation?.request?.status === "fulfilled"}>
        <Text style={styles.cardTitle}>
          {conversation?.request?.bloodGroup} Blood | {conversation?.request?.unitsNeeded} Unit(s) Needed
        </Text>
        <Text style={styles.contact}>
          Contact: {other?.firstName || other?.hospitalName || "Participant"} | {other?.phoneNumber || "Phone not shared"}
        </Text>
        {isRequester && conversation?.request?.status === "responding" ? (
          <View style={styles.actionRow}>
            <Button label="Mark Donation Completed" onPress={complete} style={styles.actionBtn} />
            <Button
              label="Donor Didn't Show Up"
              tone="outline"
              onPress={reopen}
              style={styles.actionBtn}
            />
          </View>
        ) : null}
      </Card>

      <Text style={styles.sectionTitle}>Messages</Text>
          <List
            data={conversation.messages || []}
            empty="No messages yet. Send a message to start the conversation."
            renderItem={(item) => {
              const mine = String(item.sender?._id || item.sender) === String(ctx.user?._id);
              return (
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleOther,
                  ]}
                >
                  <Text style={[styles.messageText, mine ? styles.messageTextMine : null]}>
                    {item.message}
                  </Text>
                </View>
              );
            }}
          />

          <Card style={styles.inputCard}>
            <Input
              placeholder="Type a message..."
              value={message}
              onChangeText={setMessage}
            />
            <Button label="Send message" onPress={send} style={styles.sendBtn} />
          </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginVertical: 40,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  contact: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    marginTop: 0,
    minHeight: 38,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 10,
    marginTop: 12,
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 4,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#FFE9E6", // Matches web chat-bubble.is-mine bg
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF3F8", // Matches web chat-bubble bg
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    fontWeight: "600",
  },
  messageTextMine: {
    color: theme.colors.primaryDark,
  },
  inputCard: {
    marginTop: 12,
  },
  sendBtn: {
    marginTop: 4,
  },
});
export default ChatScreen;
