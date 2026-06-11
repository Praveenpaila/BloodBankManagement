import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Stat } from "../../components/common/Stat";
import { List } from "../../components/common/List";
import { useAppContext } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";

export function AdminInventoryScreen({ tabs }) {
  const ctx = useAppContext();
  const [data, setData] = useState(null);

  const loading = useLoader(ctx, async () => {
    const res = await ctx.api("/admin/inventory");
    setData(res.data);
  });

  return (
    <Shell title="Inventory overview" tabs={tabs} loading={loading}>
      <View style={styles.grid}>
        <List
          data={data?.byBloodGroup || []}
          empty="No inventory records available."
          renderItem={(item) => (
            <Stat label={item._id} value={item.totalUnits} />
          )}
        />
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
});
export default AdminInventoryScreen;
