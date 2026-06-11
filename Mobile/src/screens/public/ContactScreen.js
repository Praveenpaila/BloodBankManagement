import React from "react";
import { Text, Alert, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAppContext, useForm } from "../../context/AppContext";
import { theme } from "../../styles/theme";

export function ContactScreen() {
  const ctx = useAppContext();
  const [form, setField, setForm] = useForm({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const send = () => {
    Alert.alert("Message sent", "We'll get back to you soon.");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <Shell title="Contact">
      <Card>
        <Text style={styles.body}>Phone: +91 90000 00000</Text>
        <Text style={styles.body}>Email: support@bloodlink.com</Text>
        <Text style={styles.body}>Address: Vijayawada, Andhra Pradesh</Text>
      </Card>
      <Card>
        <Input
          label="Your name"
          value={form.name}
          onChangeText={(v) => setField("name", v)}
        />
        <Input
          label="Email"
          value={form.email}
          onChangeText={(v) => setField("email", v)}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="Subject"
          value={form.subject}
          onChangeText={(v) => setField("subject", v)}
        />
        <Input
          label="Message"
          value={form.message}
          onChangeText={(v) => setField("message", v)}
          multiline
        />
        <Button label="Send message" onPress={send} />
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
    fontWeight: "600",
  },
});
