import React from "react";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAppContext, useForm } from "../../context/AppContext";

export function LoginScreen() {
  const ctx = useAppContext();
  const [form, setField] = useForm({ email: "", password: "" });

  return (
    <Shell title="Login">
      <Card>
        <Input
          label="Email"
          value={form.email}
          onChangeText={(v) => setField("email", v)}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="Password"
          value={form.password}
          onChangeText={(v) => setField("password", v)}
          secureTextEntry
        />
        <Button
          label="Login"
          onPress={() => ctx.login(form.email, form.password)}
        />
        <Button
          label="Forgot password"
          tone="ghost"
          onPress={() => ctx.setRoute("forgot")}
        />
        <Button
          label="Create account"
          tone="ghost"
          onPress={() => ctx.setRoute("register")}
        />
      </Card>
    </Shell>
  );
}
