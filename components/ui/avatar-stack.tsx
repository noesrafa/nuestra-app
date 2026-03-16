import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  avatars: [string | null, string | null];
  size?: "small" | "large";
};

const SIZES = {
  small: { dim: 28, border: 2, overlap: -10, heartSize: 14, heartTop: -4 },
  large: { dim: 56, border: 3, overlap: -16, heartSize: 24, heartTop: -2 },
} as const;

export function AvatarStack({ avatars, size = "small" }: Props) {
  const { colors } = useTheme();
  const s = SIZES[size];
  const radius = s.dim / 2;
  const borderColor = size === "small" ? colors.surface : colors.background;

  // Total width = 2 avatars + overlap; center of overlap zone
  const totalWidth = s.dim * 2 + s.overlap;
  const heartLeft = totalWidth / 2 - s.heartSize / 2;

  return (
    <View style={[styles.stack, size === "small" ? styles.stackSmall : styles.stackLarge]}>
      <Image
        source={{ uri: avatars[0] ?? undefined }}
        style={[
          { width: s.dim, height: s.dim, borderRadius: radius, borderWidth: s.border, borderColor },
          styles.left,
        ]}
        contentFit="cover"
      />
      <Image
        source={{ uri: avatars[1] ?? undefined }}
        style={[
          { width: s.dim, height: s.dim, borderRadius: radius, borderWidth: s.border, borderColor },
          { marginLeft: s.overlap, zIndex: 1 },
        ]}
        contentFit="cover"
      />
      <View style={[styles.heart, { top: s.heartTop, left: heartLeft, width: s.heartSize, height: s.heartSize }]}>
        <Image
          source={require("../../assets/icons-3d/heart.png")}
          style={{ width: s.heartSize, height: s.heartSize }}
          contentFit="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackSmall: {
    width: 40,
    height: 28,
  },
  stackLarge: {
    justifyContent: "center",
    marginBottom: 8,
  },
  left: {
    zIndex: 2,
  },
  heart: {
    position: "absolute",
    zIndex: 3,
    alignItems: "center",
    justifyContent: "center",
  },
});
