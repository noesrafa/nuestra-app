import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { AvatarStack } from "@/components/ui/avatar-stack";

type Props = {
  totalDays: number;
  isComplete: boolean;
  avatars: [string | null, string | null];
  avatarUrl: string | null;
  onSharePress: () => void;
  onCouplePress: () => void;
};

const GRID_PADDING = spacing.md;

export function CalendarHeader({ totalDays, isComplete, avatars, avatarUrl, onSharePress, onCouplePress }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onSharePress} style={styles.iconButton}>
        <Ionicons name="share" size={24} color={colors.accent} />
      </TouchableOpacity>

      <View style={styles.counterRow}>
        <Ionicons name="heart" size={18} color={colors.accent} />
        <Text style={[styles.counterText, { color: colors.accent }]}>{totalDays}</Text>
      </View>

      <TouchableOpacity onPress={onCouplePress} style={styles.coupleButton}>
        {isComplete && avatars[0] && avatars[1] ? (
          <AvatarStack avatars={avatars} size="small" />
        ) : (
          <View style={styles.soloAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.soloAvatarImage} contentFit="cover" />
            ) : (
              <View style={[styles.soloAvatarPlaceholder, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="person" size={18} color={colors.accent} />
              </View>
            )}
            <Text style={styles.brokenHeart}>{"\uD83D\uDC94"}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GRID_PADDING,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  counterText: {
    fontSize: 18,
    fontWeight: "700",
  },
  coupleButton: {
    width: 44,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  soloAvatar: {
    width: 36,
    height: 36,
  },
  soloAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  soloAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  brokenHeart: {
    fontSize: 14,
    position: "absolute",
    top: -2,
    right: -6,
  },
});
