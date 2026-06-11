import React, { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Button } from "../../components/common/Button";
import { List } from "../../components/common/List";
import { RequestCard } from "../../components/cards/RequestCard";
import { useAppContext } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";

export function NearbyRequestsScreen({ tabs }) {
  const ctx = useAppContext();
  const [items, setItems] = useState([]);

  const load = async () => {
    const coords = ctx.user?.location?.coordinates;
    if (!coords?.length) return;
    const data = await ctx.api(
      `/blood-requests/nearby?lat=${coords[1]}&lng=${coords[0]}`
    );
    setItems(data.data || []);
  };

  const loading = useLoader(ctx, load);

  const accept = async (id) => {
    try {
      await ctx.api(`/blood-requests/${id}/respond`, {
        method: "PUT",
        body: { action: "accept" },
      });
      ctx.setRoute(`chat:${id}`);
    } catch (err) {
      Alert.alert("Accept failed", err.message);
    }
  };

  const handleUpdateLocation = async () => {
    await ctx.updateLocation();
    await load();
  };

  return (
    <Shell title="Nearby requests" tabs={tabs} loading={loading}>
      <Button
        label="Update location"
        tone="outline"
        onPress={handleUpdateLocation}
        style={styles.locationBtn}
      />
      <List
        data={items}
        empty="No blood requests near you right now. You'll be notified when someone needs help."
        renderItem={(item) => (
          <RequestCard
            item={item}
            onAccept={
              item.status === "open" ? () => accept(item._id) : undefined
            }
          />
        )}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  locationBtn: {
    marginBottom: 14,
    marginTop: 0,
  },
});
export default NearbyRequestsScreen;
