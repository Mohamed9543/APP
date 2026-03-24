import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDrawer } from "./AppDrawer";

const COLORS = {
  green: "#22c55e",
  greenDark: "#16a34a",
  greenSoft: "#e8f8ed",
  blue: "#3b82f6",
  text: "#0f172a",
  border: "#e2e8f0",
  surface: "#ffffff",
};

export function BrandHeader({ title, right, variant = "surface" }) {
  const { toggleDrawer } = useDrawer();

  return (
    <View
      style={[
        styles.container,
        variant === "transparent" && styles.containerTransparent,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={toggleDrawer}
            activeOpacity={0.85}
          >
            <Ionicons name="menu" size={20} color={COLORS.greenDark} />
          </TouchableOpacity>
          <Text style={styles.brandText}>
            <Text style={styles.brandSmart}>Smart</Text>
            <Text style={styles.brandIrrig}>Irrig</Text>
          </Text>
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  containerTransparent: {
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  right: {
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  brandText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  brandSmart: {
    color: COLORS.green,
  },
  brandIrrig: {
    color: COLORS.blue,
  },
  title: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
});
