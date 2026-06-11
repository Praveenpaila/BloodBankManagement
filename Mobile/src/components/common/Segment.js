import React from "react";
import { PickerRow } from "./PickerRow";

export function Segment({ value, options, onChange }) {
  return (
    <PickerRow
      label="Role"
      value={value}
      options={options}
      onChange={onChange}
    />
  );
}
