import React from "react";
import { Alert } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAppContext, useForm } from "../../context/AppContext";

export function HospitalProfile({ tabs }) {
  const ctx = useAppContext();
  const [form, setField] = useForm({
    hospitalName: ctx.user?.hospitalName || ctx.user?.firstName || "",
    address: ctx.user?.address || "",
    city: ctx.user?.city || "",
    pincode: ctx.user?.pincode || "",
    phoneNumber: ctx.user?.phoneNumber || "",
    licenseNumber: ctx.user?.licenseNumber || ctx.user?.registrationNumber || "",
  });

  const save = async () => {
    try {
      const data = await ctx.api("/auth/me", { method: "PUT", body: form });
      ctx.setUser(data.data);
      Alert.alert("Saved", "Hospital profile updated.");
    } catch (err) {
      Alert.alert("Profile failed", err.message);
    }
  };

  return (
    <Shell title="Hospital profile" tabs={tabs}>
      <Card>
        <Input
          label="Hospital name"
          value={form.hospitalName}
          onChangeText={(v) => setField("hospitalName", v)}
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
        <Input
          label="Pincode"
          value={form.pincode}
          onChangeText={(v) => setField("pincode", v)}
          keyboardType="numeric"
        />
        <Input
          label="License number"
          value={form.licenseNumber}
          onChangeText={(v) => setField("licenseNumber", v)}
        />
        <Input
          label="Address"
          value={form.address}
          onChangeText={(v) => setField("address", v)}
          multiline
        />
        <Button label="Save Profile" onPress={save} />
      </Card>
    </Shell>
  );
}
export default HospitalProfile;
