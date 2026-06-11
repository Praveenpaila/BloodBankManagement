import React, { useState } from "react";
import { Alert } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAppContext, useForm } from "../../context/AppContext";

export function ForgotPasswordScreen() {
  const ctx = useAppContext();
  const [step, setStep] = useState("email");
  const [form, setField] = useForm({ email: "", token: "", newPassword: "" });

  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    try {
      setSubmitting(true);
      if (step === "email") {
        await ctx.api("/auth/forgot-password", {
          method: "POST",
          body: { email: form.email },
        });
        setStep("reset");
        Alert.alert("Reset code sent");
      } else {
        await ctx.api("/auth/reset-password", {
          method: "POST",
          body: { token: form.token, newPassword: form.newPassword },
        });
        Alert.alert("Password reset", "You can login now.");
        ctx.setRoute("login");
      }
    } catch (err) {
      Alert.alert("Reset failed", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell title="Forgot password">
      <Card>
        {step === "email" ? (
          <Input
            label="Email"
            value={form.email}
            onChangeText={(v) => setField("email", v)}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        ) : null}
        {step === "reset" ? (
          <>
            <Input
              label="Reset code"
              value={form.token}
              onChangeText={(v) => setField("token", v)}
            />
            <Input
              label="New password"
              value={form.newPassword}
              onChangeText={(v) => setField("newPassword", v)}
              secureTextEntry
            />
          </>
        ) : null}
        <Button
          label={step === "email" ? "Send code" : "Reset password"}
          onPress={submit}
          loading={submitting}
        />
      </Card>
    </Shell>
  );
}
