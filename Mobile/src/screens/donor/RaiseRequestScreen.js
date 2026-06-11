import React, { useState, useEffect } from "react";
import { Alert, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { PickerRow } from "../../components/common/PickerRow";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAppContext, useForm, BLOOD_GROUPS } from "../../context/AppContext";
import { theme } from "../../styles/theme";

export function RaiseRequestScreen({ tabs, donorSos = false }) {
  const ctx = useAppContext();
  const [form, setField] = useForm({
    bloodGroup: "O+",
    urgency: "normal",
    unitsNeeded: "1",
    radiusKm: "10",
    notes: "",
  });
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(null);
  const coords = ctx.user?.location?.coordinates;

  const refreshCount = async () => {
    if (!coords?.length) return;
    const query = `bloodGroup=${encodeURIComponent(form.bloodGroup)}&radius=${encodeURIComponent(form.radiusKm)}&lat=${coords[1]}&lng=${coords[0]}`;
    const res = await ctx.api(`/donors/count?${query}`);
    setCount(res.data?.count || 0);
  };

  useEffect(() => {
    refreshCount().catch(() => {});
  }, [form.bloodGroup, form.radiusKm, ctx.user?.location]);

  useEffect(() => {
    const socket = ctx.socket;
    if (!socket || !active?._id) return undefined;
    
    const sync = async () => {
      try {
        const res = await ctx.api("/blood-requests");
        const updated = (res.data || []).find(
          (item) => item._id === active._id
        );
        if (updated) setActive(updated);
      } catch {
        // Keep last known request state.
      }
    };
    
    socket.on("blood-request:response", sync);
    return () => socket.off("blood-request:response", sync);
  }, [ctx.socket, active?._id]);

  const submit = async () => {
    try {
      const body = {
        ...form,
        unitsNeeded: Number(form.unitsNeeded),
        radiusKm: Number(form.radiusKm),
        lat: coords?.[1],
        lng: coords?.[0],
      };
      const data = await ctx.api("/blood-requests", { method: "POST", body });
      setActive(data.data.request);
      Alert.alert(
        "Request sent",
        `Notified ${data.data.notifiedDonors} donors.`
      );
    } catch (err) {
      Alert.alert("Request failed", err.message);
    }
  };

  const cancel = async () => {
    try {
      const data = await ctx.api(`/blood-requests/${active._id}/status`, {
        method: "PUT",
        body: { status: "cancelled" },
      });
      setActive(data.data);
      Alert.alert("Cancelled");
    } catch (err) {
      Alert.alert("Cancel failed", err.message);
    }
  };

  return (
    <Shell
      title={donorSos ? "Emergency SOS" : "Raise blood request"}
      tabs={tabs}
    >
      {!coords?.length ? (
        <Card warning>
          <Text style={styles.body}>
            You must update your GPS coordinates location before sending a request.
          </Text>
          <Button label="Update Location Now" onPress={ctx.updateLocation} />
        </Card>
      ) : null}

      <Card>
        <PickerRow
          label="Blood group"
          value={form.bloodGroup}
          options={BLOOD_GROUPS}
          onChange={(v) => setField("bloodGroup", v)}
        />
        <PickerRow
          label="Urgency"
          value={form.urgency}
          options={["normal", "urgent", "critical"]}
          onChange={(v) => setField("urgency", v)}
        />
        <Input
          label="Units needed"
          value={form.unitsNeeded}
          onChangeText={(v) => setField("unitsNeeded", v)}
          keyboardType="numeric"
        />
        <Input
          label="Radius km"
          value={form.radiusKm}
          onChangeText={(v) => setField("radiusKm", v)}
          keyboardType="numeric"
        />
        <Input
          label="Notes"
          value={form.notes}
          onChangeText={(v) => setField("notes", v)}
          multiline
        />
        <Text style={styles.countText}>
          {count} eligible donor(s) found in this area
        </Text>
        {count === 0 && Number(form.radiusKm) < 50 ? (
          <Text style={styles.warn}>Try increasing the radius.</Text>
        ) : null}
        {count === 0 && Number(form.radiusKm) >= 50 ? (
          <Text style={styles.danger}>Contact hospitals directly.</Text>
        ) : null}
        <Button
          label={donorSos ? "Raise Emergency SOS" : "Request Blood"}
          onPress={submit}
          disabled={!coords?.length}
        />
        {donorSos && active?.status === "open" ? (
          <Button label="Cancel request" tone="outline" onPress={cancel} />
        ) : null}
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: theme.colors.text,
    lineHeight: 22,
    fontSize: 14,
    marginBottom: 10,
    fontWeight: "700",
  },
  countText: {
    fontWeight: "800",
    color: theme.colors.text,
    fontSize: 14,
    marginVertical: 6,
  },
  warn: {
    color: theme.colors.warningText,
    fontWeight: "800",
    marginTop: 4,
    fontSize: 13,
  },
  danger: {
    color: theme.colors.dangerText,
    fontWeight: "800",
    marginTop: 4,
    fontSize: 13,
  },
});
export default RaiseRequestScreen;
