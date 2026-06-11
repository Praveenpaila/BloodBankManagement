import React, { useState } from "react";
import { Alert, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { PickerRow } from "../../components/common/PickerRow";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAppContext, useForm } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function AppointmentScreen({ tabs }) {
  const ctx = useAppContext();
  const [data, setData] = useState({ hospitals: [], eligibility: {} });
  const [confirmed, setConfirmed] = useState(null);
  const [form, setField] = useForm({
    hospital: "",
    date: "",
    timeSlot: "Morning",
  });

  const loading = useLoader(ctx, async () => {
    const [eligibility, hospitals] = await Promise.all([
      ctx.api("/eligibility/status"),
      ctx.api("/hospitals/list"),
    ]);
    setData({ eligibility: eligibility.data, hospitals: hospitals.data || [] });
  });

  const submit = async () => {
    try {
      await ctx.api("/appointments", { method: "POST", body: form });
      setConfirmed({
        ...form,
        hospitalName:
          data.hospitals.find((h) => h._id === form.hospital)?.firstName ||
          "Selected hospital",
      });
      Alert.alert("Confirmed", "Appointment booked.");
    } catch (err) {
      Alert.alert("Appointment failed", err.message);
    }
  };

  const eligible = data.eligibility?.status === "eligible";

  return (
    <Shell title="Book appointment" tabs={tabs} loading={loading}>
      {!eligible ? (
        <Card warning>
          <Text style={styles.warningText}>
            You must complete an eligibility check and be marked as eligible before booking an appointment.
          </Text>
          <Button
            label="Check Eligibility Now"
            tone="outline"
            onPress={() => ctx.setRoute("donor:eligibility")}
            style={styles.redirectBtn}
          />
        </Card>
      ) : null}

      <Card>
        <PickerRow
          label="Hospital"
          value={form.hospital}
          options={["", ...data.hospitals.map((h) => h._id)]}
          labels={{
            "": "Select hospital",
            ...Object.fromEntries(
              data.hospitals.map((h) => [h._id, h.hospitalName || h.firstName]),
            ),
          }}
          onChange={(v) => setField("hospital", v)}
        />
        <Input
          label="Date YYYY-MM-DD"
          value={form.date}
          onChangeText={(v) => setField("date", v)}
        />
        <PickerRow
          label="Time slot"
          value={form.timeSlot}
          options={["Morning", "Afternoon", "Evening"]}
          onChange={(v) => setField("timeSlot", v)}
        />
        <Button
          label="Book appointment"
          onPress={submit}
          disabled={!eligible}
        />
      </Card>

      {confirmed ? (
        <Card success>
          <Text style={styles.successTitle}>Appointment Booked!</Text>
          <Text style={styles.successText}>
            Hospital: {confirmed.hospitalName}
          </Text>
          <Text style={styles.successText}>
            Date: {confirmed.date} | Slot: {confirmed.timeSlot}
          </Text>
        </Card>
      ) : null}
    </Shell>
  );
}

const styles = StyleSheet.create({
  warningText: {
    color: theme.colors.warningText,
    fontWeight: "800",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  redirectBtn: {
    marginTop: 6,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.successText,
    marginBottom: 4,
  },
  successText: {
    fontSize: 14,
    color: theme.colors.successText,
    fontWeight: "750",
  },
});
export default AppointmentScreen;
