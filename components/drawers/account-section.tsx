import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/constants/theme";
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
  const { colors } = useTheme();

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
      <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
        <CardRow
          icon="person-outline"
          text={displayName ?? "Sin nombre"}
          subtext={user?.email ?? ""}
        />
      </View>
      <TouchableOpacity onPress={confirmLogout} style={styles.logoutButton} activeOpacity={0.5}>
        <Ionicons name="log-out-outline" size={18} color={colors.accent} style={{ opacity: 0.6 }} />
        <Text style={[styles.logoutText, { color: colors.accent }]}>Cerrar sesión</Text>
      </TouchableOpacity>
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
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    marginTop: spacing.lg,
    marginBottom: 100,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "500",
    opacity: 0.6,
  },
});
