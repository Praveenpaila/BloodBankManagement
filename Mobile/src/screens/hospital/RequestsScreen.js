import React, { useState } from "react";
import { Alert } from "react-native";
import { Shell } from "../../components/common/Shell";
import { List } from "../../components/common/List";
import { RequestStatusCard } from "../../components/cards/RequestStatusCard";
import { useAppContext } from "../../context/AppContext";
import { useLoader } from "../../utils/useLoader";

export function RequestsScreen({ tabs, admin = false }) {
  const ctx = useAppContext();
  const [items, setItems] = useState([]);
  const endpoint = admin ? "/admin/requests" : "/blood-requests";

  const load = async () => {
    const res = await ctx.api(endpoint);
    setItems(res.data || []);
  };

  const loading = useLoader(ctx, load);

  const status = async (id, next) => {
    try {
      await ctx.api(`/blood-requests/${id}/status`, {
        method: "PUT",
        body: { status: next },
      });
      load();
    } catch (err) {
      Alert.alert("Status failed", err.message);
    }
  };

  return (
    <Shell title={admin ? "Requests log" : "Request status"} tabs={tabs} loading={loading}>
      <List
        data={items}
        empty="No requests yet."
        renderItem={(item) => (
          <RequestStatusCard
            item={item}
            admin={admin}
            status={status}
          />
        )}
      />
    </Shell>
  );
}
export default RequestsScreen;
