import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { List } from "../../components/common/List";
import { BloodGroupPill } from "../../components/common/BloodGroupPill";
import { Button } from "../../components/common/Button";
import { useAppContext, fmtDate } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function DonationHistoryScreen({ tabs }) {
  const ctx = useAppContext();
  const [items, setItems] = useState([]);

  const loading = useLoader(
    ctx,
    async () => setItems((await ctx.api("/donations/my-history")).data || []),
    [ctx.donationTick],
  );

  return (
    <Shell title="Donation history" tabs={tabs} loading={loading}>
      <List
        data={items}
        empty="You haven't donated yet. Book your first appointment!"
        renderItem={(item) => (
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{fmtDate(item.donationDate)}</Text>
              <BloodGroupPill group={item.bloodGroup} />
            </View>
            <Text style={styles.hospital}>
              {item.hospital?.hospitalName || item.hospital?.firstName || "Hospital"}
            </Text>
            <Text style={styles.units}>
              Units: {item.units} unit(s)
            </Text>
            <Text
              style={[
                styles.sourceTag,
                item.source === "sos"
                  ? styles.sosTag
                  : item.source === "appointment"
                    ? styles.appointmentTag
                    : styles.regularTag,
              ]}
            >
              {item.source === "sos"
                ? "SOS Response"
                : item.source === "appointment"
                  ? "Scheduled Appointment"
                  : "Regular Donation"}
            </Text>
            {item.certificateId ? (
              <Text style={styles.certificate}>
                Certificate ID: {item.certificateId}
              </Text>
            ) : null}
          </Card>
        )}
      />
      {!items.length ? (
        <Button
          label="Book appointment"
          onPress={() => ctx.setRoute("donor:appointments")}
        />
      ) : null}
    </Shell>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
  },
  hospital: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "750",
    marginBottom: 2,
  },
  units: {
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 6,
  },
  sourceTag: {
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: "hidden",
  },
  sosTag: {
    backgroundColor: theme.colors.dangerBg,
    color: theme.colors.dangerText,
  },
  regularTag: {
    backgroundColor: theme.colors.successBg,
    color: theme.colors.successText,
  },
  appointmentTag: {
    backgroundColor: theme.colors.infoBg,
    color: theme.colors.infoText,
  },
  certificate: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
});
export default DonationHistoryScreen;
