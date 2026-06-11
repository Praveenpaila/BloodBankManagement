import React, { useState } from "react";
import { Alert } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Segment } from "../../components/common/Segment";
import { PickerRow } from "../../components/common/PickerRow";
import { useAppContext, useForm, BLOOD_GROUPS } from "../../context/AppContext";

export function RegisterScreen() {
  const ctx = useAppContext();
  const [form, setField] = useForm({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    otp: "",
    role: "donor",
    bloodGroup: "O+",
    dob: "",
    gender: "male",
    emergencyContact: "",
    age: "",
    city: "",
    hospitalName: "",
    address: "",
    pincode: "",
    licenseNumber: "",
  });

  const [sendingOtp, setSendingOtp] = useState(false);

  const sendOtp = async () => {
    try {
      setSendingOtp(true);
      const data = await ctx.api("/auth/send-otp", {
        method: "POST",
        body: { email: form.email, phoneNumber: form.phoneNumber },
      });
      Alert.alert(
        "OTP sent",
        data.data?.otp
          ? `Development OTP: ${data.data.otp}`
          : "Check your email.",
      );
    } catch (err) {
      Alert.alert("OTP failed", err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  return (
    <Shell title="Register">
      <Card>
        <Segment
          value={form.role}
          options={["donor", "hospital"]}
          onChange={(v) => setField("role", v)}
        />
        <Input
          label={form.role === "hospital" ? "Contact first name" : "First name"}
          value={form.firstName}
          onChangeText={(v) => setField("firstName", v)}
        />
        <Input
          label="Last name"
          value={form.lastName}
          onChangeText={(v) => setField("lastName", v)}
        />
        <Input
          label="Email"
          value={form.email}
          onChangeText={(v) => setField("email", v)}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="Phone"
          value={form.phoneNumber}
          onChangeText={(v) => setField("phoneNumber", v)}
          keyboardType="phone-pad"
        />
        <Button label="Send OTP" tone="outline" onPress={sendOtp} loading={sendingOtp} />
        <Input
          label="OTP"
          value={form.otp}
          onChangeText={(v) => setField("otp", v)}
          keyboardType="numeric"
        />
        <Input
          label="Password"
          value={form.password}
          onChangeText={(v) => setField("password", v)}
          secureTextEntry
        />
        <Input
          label="City"
          value={form.city}
          onChangeText={(v) => setField("city", v)}
        />
        {form.role === "donor" ? (
          <>
            <PickerRow
              label="Blood group"
              value={form.bloodGroup}
              options={BLOOD_GROUPS}
              onChange={(v) => setField("bloodGroup", v)}
            />
            <Input
              label="Date of birth YYYY-MM-DD"
              value={form.dob}
              onChangeText={(v) => setField("dob", v)}
            />
            <PickerRow
              label="Gender"
              value={form.gender}
              options={["male", "female", "other"]}
              onChange={(v) => setField("gender", v)}
            />
            <Input
              label="Emergency contact"
              value={form.emergencyContact}
              onChangeText={(v) => setField("emergencyContact", v)}
              keyboardType="phone-pad"
            />
            <Input
              label="Age"
              value={form.age}
              onChangeText={(v) => setField("age", v)}
              keyboardType="numeric"
            />
          </>
        ) : null}
        {form.role === "hospital" ? (
          <>
            <Input
              label="Hospital name"
              value={form.hospitalName}
              onChangeText={(v) => setField("hospitalName", v)}
            />
            <Input
              label="Address"
              value={form.address}
              onChangeText={(v) => setField("address", v)}
              multiline
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
          </>
        ) : null}
        <Button label="Create account" onPress={() => ctx.register(form)} />
      </Card>
    </Shell>
  );
}
