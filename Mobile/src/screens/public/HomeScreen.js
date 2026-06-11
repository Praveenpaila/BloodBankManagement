import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shell } from "../../components/common/Shell";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { useAppContext } from "../../context/AppContext";
import { theme } from "../../styles/theme";

export function HomeScreen() {
  const ctx = useAppContext();

  return (
    <Shell title="Donate blood. Request blood. Stay connected.">
      <Card>
        <Text style={styles.hero}>
          Every urgent request, donor alert, hospital workflow, and admin action
          now has a mobile path.
        </Text>
        <View style={styles.row}>
          <Button
            label="Login"
            onPress={() => ctx.setRoute("login")}
            style={styles.actionBtn}
          />
          <Button
            label="Register"
            tone="outline"
            onPress={() => ctx.setRoute("register")}
            style={styles.actionBtn}
          />
        </View>
      </Card>
      <View style={styles.grid}>
        <Button
          label="Search donors"
          tone="outline"
          onPress={() => ctx.setRoute("publicSearch")}
          style={styles.gridBtn}
        />
        <Button
          label="Contact"
          tone="outline"
          onPress={() => ctx.setRoute("contact")}
          style={styles.gridBtn}
        />
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  hero: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    marginTop: 0,
  },
  gridBtn: {
    flexGrow: 1,
    flexBasis: "46%",
    marginTop: 0,
  },
});
