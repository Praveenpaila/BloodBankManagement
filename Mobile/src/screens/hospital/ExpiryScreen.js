import React, { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { List } from "../../components/common/List";
import { useAppContext, fmtDate } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";
import { theme } from "../../styles/theme";

export function ExpiryScreen({ tabs }) {
  const ctx = useAppContext();
  const [items, setItems] = useState([]);

  const loading = useLoader(ctx, async () => {
    const res = await ctx.api("/inventory/expiry-alerts");
    setItems(res.data || []);
  });

  return (
    <Shell title="Expiry alerts" tabs={tabs} loading={loading}>
      <List
        data={items}
        empty="No expiring stock in inventory."
        renderItem={(item) => (
          <Card danger>
            <Text style={styles.cardTitle}>{item.bloodGroup} Warning</Text>
            <Text style={styles.body}>
              {item.units} unit(s) expiring on {fmtDate(item.expiryDate)}
            </Text>
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
    color: theme.colors.dangerText,
    marginBottom: 6,
  },
  body: {
    color: theme.colors.dangerText,
    fontWeight: "750",
    fontSize: 14,
  },
});
export default ExpiryScreen;
