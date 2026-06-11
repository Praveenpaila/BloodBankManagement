import React from "react";
import { Alert } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { PickerRow } from "../../components/common/PickerRow";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAppContext, useForm, BLOOD_GROUPS } from "../../context/AppContext";

export function BroadcastScreen({ tabs }) {
  const ctx = useAppContext();
  const prefill = ctx.route.startsWith("admin:broadcast:")
    ? ctx.route.split(":")[2]
    : "";

  const [form, setField] = useForm({
    targetRole: prefill ? "donor" : "",
    targetBloodGroup: prefill,
    title: prefill ? `${prefill} blood urgently needed` : "",
    message: prefill
      ? `BloodLink has a critical shortage of ${prefill}. Please donate if you are eligible.`
      : "",
  });

  const send = async () => {
    try {
      const res = await ctx.api("/admin/broadcast", {
        method: "POST",
        body: form,
      });
      Alert.alert("Broadcast sent", res.message || "Done");
    } catch (err) {
      Alert.alert("Broadcast failed", err.message);
    }
  };

  return (
    <Shell title="Broadcast alerts" tabs={tabs}>
      <Card>
        <PickerRow
          label="Target role"
          value={form.targetRole}
          options={["", "donor", "hospital"]}
          labels={{ "": "All users" }}
          onChange={(v) => setField("targetRole", v)}
        />
        <PickerRow
          label="Blood group"
          value={form.targetBloodGroup}
          options={["", ...BLOOD_GROUPS]}
          labels={{ "": "Any" }}
          onChange={(v) => setField("targetBloodGroup", v)}
        />
        <Input
          label="Title"
          value={form.title}
          onChangeText={(v) => setField("title", v)}
        />
        <Input
          label="Message"
          value={form.message}
          onChangeText={(v) => setField("message", v)}
          multiline
        />
        <Button label="Send Broadcast Alert" onPress={send} />
      </Card>
    </Shell>
  );
}
export default BroadcastScreen;
