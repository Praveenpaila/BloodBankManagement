import React, { useState } from "react";
import { Alert } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { PickerRow } from "../../components/common/PickerRow";
import { List } from "../../components/common/List";
import { DonorCard } from "../../components/cards/DonorCard";
import { useAppContext, useForm, BLOOD_GROUPS } from "../../context/AppContext";

export function PublicSearchScreen({ tabs }) {
  const ctx = useAppContext();
  const [filters, setField] = useForm({ bloodGroup: "", city: "" });
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    try {
      setSearching(true);
      const query = `bloodGroup=${encodeURIComponent(filters.bloodGroup)}&city=${encodeURIComponent(filters.city)}`;
      const data = await ctx.api(`/donors/search?${query}`);
      setResults(data.data || []);
    } catch (err) {
      Alert.alert("Search failed", err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Shell title="Public donor search" tabs={tabs}>
      <Card>
        <PickerRow
          label="Blood group"
          value={filters.bloodGroup}
          options={["", ...BLOOD_GROUPS]}
          onChange={(v) => setField("bloodGroup", v)}
        />
        <Input
          label="City"
          value={filters.city}
          onChangeText={(v) => setField("city", v)}
        />
        <Button label="Search" onPress={search} loading={searching} />
      </Card>
      <List
        data={results}
        empty="No public donor matches yet."
        renderItem={(item) => <DonorCard donor={item} />}
      />
    </Shell>
  );
}
export default PublicSearchScreen;
