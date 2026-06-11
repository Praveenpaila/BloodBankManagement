import React, { useState } from "react";
import { View, Text, Modal, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { PickerRow } from "../../components/common/PickerRow";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { List } from "../../components/common/List";
import { useAppContext } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function UserManagementScreen({ tabs }) {
  const ctx = useAppContext();
  const [role, setRole] = useState("");
  const [items, setItems] = useState([]);
  const [suspending, setSuspending] = useState(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    const res = await ctx.api(`/admin/users?role=${role}`);
    setItems(res.data || []);
  };

  const loading = useLoader(ctx, load, [role]);

  const action = async (id, name, body = {}) => {
    try {
      await ctx.api(`/admin/users/${id}/${name}`, { method: "PUT", body });
      setSuspending(null);
      setReason("");
      load();
    } catch (err) {
      Alert.alert("Action failed", err.message);
    }
  };

  return (
    <Shell title="User management" tabs={tabs} loading={loading}>
      <PickerRow
        label="Role filter"
        value={role}
        options={["", "donor", "hospital", "organization", "admin"]}
        labels={{ "": "All" }}
        onChange={setRole}
      />
      
      <Text style={styles.sectionTitle}>User Accounts</Text>
      <List
        data={items}
        empty="No users found."
        renderItem={(u) => (
          <Card success={u.isActive} danger={!u.isActive}>
            <Text style={styles.cardTitle}>
              {u.firstName} {u.lastName || ""}
            </Text>
            <Text style={styles.meta}>
              Email: {u.email} | Role: {u.role}
            </Text>
            <Text style={styles.status}>
              Status: {u.isActive ? "Active" : "Suspended"}
              {u.role === "hospital" && !u.isApproved ? " / Pending Approval" : ""}
            </Text>
            <View style={styles.row}>
              {u.role === "hospital" && !u.isApproved ? (
                <Button
                  label="Approve"
                  tone="outline"
                  onPress={() => action(u._id, "approve")}
                  style={styles.actionBtn}
                />
              ) : null}
              <Button
                label={u.isActive ? "Suspend" : "Activate"}
                tone="outline"
                onPress={() =>
                  u.isActive ? setSuspending(u) : action(u._id, "activate")
                }
                style={styles.actionBtn}
              />
            </View>
          </Card>
        )}
      />

      <Modal visible={Boolean(suspending)} transparent animationType="fade">
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Suspend User</Text>
            <Input
              label="Reason for suspension"
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                tone="outline"
                onPress={() => setSuspending(null)}
                style={styles.modalBtn}
              />
              <Button
                label="Suspend"
                onPress={() => action(suspending._id, "suspend", { reason })}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 10,
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "650",
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    marginTop: 0,
    minHeight: 38,
  },
  modalShade: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 16,
    ...theme.shadows.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    marginTop: 0,
  },
});
export default UserManagementScreen;
