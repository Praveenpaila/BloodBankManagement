import React, { useState } from "react";
import { Alert } from "react-native";
import { Shell } from "../../components/common/Shell";
import { List } from "../../components/common/List";
import { NotificationCard } from "../../components/cards/NotificationCard";
import { useAppContext } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";

export function NotificationsScreen({ tabs }) {
  const ctx = useAppContext();
  const [items, setItems] = useState([]);

  const load = async () => {
    const data = await ctx.api("/notifications");
    setItems(data.data || []);
  };

  const loading = useLoader(ctx, load);

  const respond = async (requestId, action) => {
    try {
      const data = await ctx.api(`/blood-requests/${requestId}/respond`, {
        method: "PUT",
        body: { action },
      });
      if (action === "accept") {
        ctx.setRoute(`chat:${requestId}`);
      } else {
        Alert.alert("Saved", data.message || "Response saved.");
      }
      load();
    } catch (err) {
      Alert.alert("Response failed", err.message);
    }
  };

  return (
    <Shell title="Notifications" tabs={tabs} loading={loading}>
      <List
        data={items}
        empty="You're all caught up. No new notifications."
        renderItem={(item) => (
          <NotificationCard item={item} respond={respond} />
        )}
      />
    </Shell>
  );
}
export default NotificationsScreen;
