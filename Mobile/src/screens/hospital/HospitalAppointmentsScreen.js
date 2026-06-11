import React, { useState } from "react";
import { Alert, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { List } from "../../components/common/List";
import { useAppContext, titleCase, fmtDate } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function HospitalAppointmentsScreen({ tabs }) {
  const ctx = useAppContext();
  const [items, setItems] = useState([]);

  const load = async () => {
    const res = await ctx.api("/appointments");
    setItems(res.data || []);
  };

  const loading = useLoader(ctx, load);

  const complete = async (id) => {
    try {
      const data = await ctx.api(`/appointments/${id}/complete`, {
        method: "PUT",
      });
      const loyalty = data.data?.loyalty;
      Alert.alert(
        "Donation recorded",
        loyalty
          ? `Donor earned +${loyalty.pointsAwarded} points.`
          : "Appointment completed."
      );
      load();
    } catch (err) {
      Alert.alert("Record failed", err.message);
    }
  };

  return (
    <Shell title="Appointments" tabs={tabs} loading={loading}>
      <List
        data={items}
        empty="No appointments scheduled yet."
        renderItem={(item) => (
          <Card success={item.status === "completed"}>
            <Text style={styles.cardTitle}>
              Donor: {item.donor?.firstName} {item.donor?.lastName || ""}
            </Text>
            <Text style={styles.meta}>
              Group: {item.donor?.bloodGroup} | Date: {fmtDate(item.date)} | Slot: {item.timeSlot}
            </Text>
            <Text style={styles.status}>
              Status: {titleCase(item.status)}
            </Text>
            {item.status === "scheduled" ? (
              <Button
                label="Mark Donated"
                onPress={() => complete(item._id)}
                style={styles.actionBtn}
              />
            ) : null}
          </Card>
        )}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "750",
    marginBottom: 4,
  },
  status: {
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 6,
  },
  actionBtn: {
    marginTop: 8,
    minHeight: 38,
  },
});
export default HospitalAppointmentsScreen;
