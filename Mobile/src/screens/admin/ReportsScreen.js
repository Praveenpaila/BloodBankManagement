import React from "react";
import { Alert } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";

export function ReportsScreen({ tabs }) {
  return (
    <Shell title="Reports" tabs={tabs}>
      <Card>
        <Button
          label="Generate Report"
          onPress={() => Alert.alert("Report generated")}
        />
        <Button
          label="Export CSV"
          tone="outline"
          onPress={() =>
            Alert.alert(
              "Export ready",
              "CSV export is available in the web app download flow."
            )
          }
        />
      </Card>
    </Shell>
  );
}
export default ReportsScreen;
