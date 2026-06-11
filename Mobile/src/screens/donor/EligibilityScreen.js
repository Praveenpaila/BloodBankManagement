import React, { useState } from "react";
import { Alert, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Toggle } from "../../components/common/Toggle";
import { PickerRow } from "../../components/common/PickerRow";
import { Button } from "../../components/common/Button";
import { DeferredBanner } from "../../components/common/DeferredBanner";
import { useAppContext, useForm, titleCase } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function EligibilityScreen({ tabs }) {
  const ctx = useAppContext();
  const [previous, setPrevious] = useState(null);
  const [result, setResult] = useState(null);
  const [form, setField] = useForm({
    age: "",
    weight: "",
    recentIllness: false,
    medications: false,
    travelHistory: false,
    tattooPiercing: false,
    hemoglobin: "",
    gender: "male",
  });

  const loading = useLoader(
    ctx,
    async () => setPrevious((await ctx.api("/eligibility/status")).data),
    [ctx.eligibilityTick],
  );

  const submit = async () => {
    try {
      const data = await ctx.api("/eligibility/check", {
        method: "POST",
        body: form,
      });
      setResult(data.data);
    } catch (err) {
      Alert.alert("Eligibility failed", err.message);
    }
  };

  return (
    <Shell title="Eligibility check" tabs={tabs} loading={loading}>
      <DeferredBanner eligibility={previous} />
      {previous ? (
        <Card warning={previous.status !== "eligible"} success={previous.status === "eligible"}>
          <Text style={styles.cardTitle}>Previous Eligibility Check</Text>
          <Text style={styles.body}>
            Status: {titleCase(previous.status || previous.record?.status || "")}
          </Text>
          {previous.deferralReason ? (
            <Text style={styles.deferralReason}>{previous.deferralReason}</Text>
          ) : null}
        </Card>
      ) : null}
      
      <Card>
        <Text style={styles.sectionHeader}>Health Questionnaire</Text>
        <Input
          label="Age"
          value={form.age}
          onChangeText={(v) => setField("age", v)}
          keyboardType="numeric"
        />
        <Input
          label="Weight (kg)"
          value={form.weight}
          onChangeText={(v) => setField("weight", v)}
          keyboardType="numeric"
        />
        <Toggle
          label="Recent illness (in last 14 days)"
          value={form.recentIllness}
          onChange={(v) => setField("recentIllness", v)}
        />
        <Toggle
          label="Taking medications"
          value={form.medications}
          onChange={(v) => setField("medications", v)}
        />
        <Toggle
          label="Recent international travel"
          value={form.travelHistory}
          onChange={(v) => setField("travelHistory", v)}
        />
        <Toggle
          label="Tattoo or piercing (in last 6 months)"
          value={form.tattooPiercing}
          onChange={(v) => setField("tattooPiercing", v)}
        />
        <Input
          label="Hemoglobin level (g/dL)"
          value={form.hemoglobin}
          onChangeText={(v) => setField("hemoglobin", v)}
          keyboardType="numeric"
        />
        <PickerRow
          label="Gender"
          value={form.gender}
          options={["male", "female", "other"]}
          onChange={(v) => setField("gender", v)}
        />
        <Button label="Submit check" onPress={submit} />
      </Card>

      {result ? (
        <Card warning={result.status !== "eligible"} success={result.status === "eligible"}>
          <Text style={styles.cardTitle}>
            Check Result: {titleCase(result.status)}
          </Text>
          <Text style={styles.body}>
            {result.reason || "You are eligible to donate."}
          </Text>
          {result.deferralUntil ? (
            <Text style={styles.deferralReason}>
              Deferred until: {new Date(result.deferralUntil).toLocaleDateString()}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </Shell>
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
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "600",
  },
  deferralReason: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 6,
  },
});
export default EligibilityScreen;
