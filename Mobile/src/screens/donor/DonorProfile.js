import React from "react";
import { Alert } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { PickerRow } from "../../components/common/PickerRow";
import { Button } from "../../components/common/Button";
import { useAppContext, useForm, BLOOD_GROUPS } from "../../context/AppContext";

export function DonorProfile({ tabs }) {
  const ctx = useAppContext();
  const [form, setField] = useForm({
    firstName: ctx.user?.firstName || "",
    lastName: ctx.user?.lastName || "",
    phoneNumber: ctx.user?.phoneNumber || "",
    city: ctx.user?.city || "",
    bloodGroup: ctx.user?.bloodGroup || "O+",
  });

  const save = async () => {
    try {
      const data = await ctx.api("/auth/me", { method: "PUT", body: form });
      ctx.setUser(data.data);
      Alert.alert("Saved", "Profile updated.");
    } catch (err) {
      Alert.alert("Profile failed", err.message);
    }
  };

  return (
    <Shell title="My profile" tabs={tabs}>
      <Card>
        <Input
          label="First name"
          value={form.firstName}
          onChangeText={(v) => setField("firstName", v)}
        />
        <Input
          label="Last name"
          value={form.lastName}
          onChangeText={(v) => setField("lastName", v)}
        />
        <Input
          label="Phone"
          value={form.phoneNumber}
          onChangeText={(v) => setField("phoneNumber", v)}
          keyboardType="phone-pad"
        />
        <Input
          label="City"
          value={form.city}
          onChangeText={(v) => setField("city", v)}
        />
        <PickerRow
          label="Blood group"
          value={form.bloodGroup}
          options={BLOOD_GROUPS}
          onChange={(v) => setField("bloodGroup", v)}
        />
        <Button label="Save profile" onPress={save} />
        <Button
          label="Update location"
          tone="outline"
          onPress={ctx.updateLocation}
        />
      </Card>
    </Shell>
  );
}
export default DonorProfile;
