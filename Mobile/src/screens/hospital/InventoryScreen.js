import React, { useState } from "react";
import { Alert, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { PickerRow } from "../../components/common/PickerRow";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { List } from "../../components/common/List";
import { useAppContext, useForm, BLOOD_GROUPS, fmtDate } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function InventoryScreen({ tabs }) {
  const ctx = useAppContext();
  const [items, setItems] = useState([]);
  const [form, setField, setForm] = useForm({
    bloodGroup: "O+",
    units: "1",
    expiryDate: "",
  });

  const load = async () => {
    const res = await ctx.api("/inventory");
    setItems(res.data || []);
  };

  const loading = useLoader(ctx, load);

  const save = async () => {
    try {
      await ctx.api("/inventory", {
        method: "POST",
        body: { ...form, units: Number(form.units) },
      });
      setForm({ bloodGroup: "O+", units: "1", expiryDate: "" });
      load();
    } catch (err) {
      Alert.alert("Inventory failed", err.message);
    }
  };

  const del = async (id) => {
    try {
      await ctx.api(`/inventory/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      Alert.alert("Delete failed", err.message);
    }
  };

  return (
    <Shell title="Inventory" tabs={tabs} loading={loading}>
      <Card>
        <Text style={styles.formTitle}>Add Blood Stock</Text>
        <PickerRow
          label="Blood group"
          value={form.bloodGroup}
          options={BLOOD_GROUPS}
          onChange={(v) => setField("bloodGroup", v)}
        />
        <Input
          label="Units"
          value={form.units}
          onChangeText={(v) => setField("units", v)}
          keyboardType="numeric"
        />
        <Input
          label="Expiry YYYY-MM-DD"
          value={form.expiryDate}
          onChangeText={(v) => setField("expiryDate", v)}
        />
        <Button label="Add Stock" onPress={save} />
      </Card>

      <Text style={styles.sectionTitle}>Current Stock Logs</Text>
      <List
        data={items}
        empty="No stock logs yet. Use the form above to add blood stock."
        renderItem={(item) => (
          <Card>
            <Text style={styles.cardTitle}>{item.bloodGroup} Stock</Text>
            <Text style={styles.meta}>
              Units: {item.units} unit(s) | Expiry: {fmtDate(item.expiryDate)}
            </Text>
            <Button
              label="Delete Stock"
              tone="danger"
              onPress={() => del(item._id)}
              style={styles.deleteBtn}
            />
          </Card>
        )}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  formTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 10,
    marginTop: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 8,
  },
  deleteBtn: {
    marginTop: 6,
    minHeight: 38,
  },
});
export default InventoryScreen;
