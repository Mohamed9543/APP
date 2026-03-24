import { View, Text } from "react-native";

const SIZE_MAP = {
  xs: { logoWidth: 72,  logoHeight: 44,  wordmarkSize: 22 },
  sm: { logoWidth: 140, logoHeight: 84,  wordmarkSize: 40 },
  md: { logoWidth: 180, logoHeight: 108, wordmarkSize: 48 },
  lg: { logoWidth: 220, logoHeight: 132, wordmarkSize: 56 },
};

export function Logo({ size = "md", withWordmark = true, compact = false }) {
  const selected = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <View style={{ alignItems: "center", marginBottom: compact ? 0 : 32 }}>
      {withWordmark ? (
        <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 2 }}>
          <Text style={{ color: "#4CAF50", fontSize: selected.wordmarkSize, fontWeight: "700", letterSpacing: -0.8 }}>
            Smart
          </Text>
          <Text style={{ color: "#2196F3", fontSize: selected.wordmarkSize, fontWeight: "700", letterSpacing: -0.8 }}>
            Irrig
          </Text>
        </View>
      ) : null}
      <View style={{ width: selected.logoWidth, height: selected.logoHeight / 2, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: selected.wordmarkSize * 0.9 }}>🌿</Text>
      </View>
    </View>
  );
}
