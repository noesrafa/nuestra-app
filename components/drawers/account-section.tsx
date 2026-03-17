import { View, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { spacing, SEMANTIC_COLORS } from "@/constants/theme";
import { DB } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { CardRow } from "@/components/ui/card-row";

type Props = {
  onClose?: () => void;
};

export function AccountSection({ onClose }: Props) {
  const { user } = useAuth();
  const { displayName } = useProfile(user?.id);
  const { colors, isDark } = useTheme();

  async function confirmLogout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onClose?.();
    if (user) {
      await supabase.from(DB.TABLES.SPOTIFY_TOKENS).delete().eq("user_id", user.id);
    }
    await supabase.auth.signOut();
  }

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.accent }]}>CUENTA</Text>
      <View style={[styles.card, { backgroundColor: isDark ? colors.accentLight : "#FFFFFF" }]}>
        <CardRow
          icon="person-outline"
          text={displayName ?? "Sin nombre"}
          subtext={user?.email ?? ""}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <CardRow
          icon="log-out-outline"
          iconColor={SEMANTIC_COLORS.DANGER}
          text="Cerrar sesión"
          textColor={SEMANTIC_COLORS.DANGER}
          onPress={confirmLogout}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
});
