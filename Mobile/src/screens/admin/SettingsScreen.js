import React from "react";
import { Alert } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAppContext, useForm } from "../../context/AppContext";

export function SettingsScreen({ tabs }) {
  const ctx = useAppContext();
  const [form, setField] = useForm({
    radius: "10",
    expiry: "14",
    escalation: "30",
  });

  const save = () => {
    Alert.alert("Saved", "Mobile settings saved locally for this session.");
  };

  return (
    <Shell title="System settings" tabs={tabs}>
      <Card>
        <Input
          label="Default radius (km)"
          value={form.radius}
          onChangeText={(v) => setField("radius", v)}
          keyboardType="numeric"
        />
        <Input
          label="Expiry alert threshold (days)"
          value={form.expiry}
          onChangeText={(v) => setField("expiry", v)}
          keyboardType="numeric"
        />
        <Input
          label="Escalation threshold (minutes)"
          value={form.escalation}
          onChangeText={(v) => setField("escalation", v)}
          keyboardType="numeric"
        />
        <Button label="Save Config" onPress={save} />
      </Card>
    </Shell>
  );
}
export default SettingsScreen;
