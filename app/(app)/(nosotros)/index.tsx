import { ScrollView, Text, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useCouple } from "@/hooks/use-couple";
import { useSpace } from "@/hooks/use-space";
import { useProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { useRealtime } from "@/hooks/use-realtime";
import { DB } from "@/lib/constants";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { CoupleCard } from "@/components/drawers/couple-card";
import { PartnerSection } from "@/components/drawers/partner-section";
import { SpaceSection } from "@/components/drawers/space-section";
import { ThemeSection } from "@/components/drawers/theme-section";
import { AccountSection } from "@/components/drawers/account-section";

export default function NosotrosScreen() {
  const { user } = useAuth();
  const { avatarUrl } = useProfile(user?.id);
  const { colors } = useTheme();
  const { inviteCode, isComplete, avatars, refetch: refetchCouple } = useCouple();
  const {
    isActive, isPaused, isPendingDelete,
    pausedBy, deleteRequestedBy,
    refetch: refetchSpace,
  } = useSpace();

  // Couples realtime is handled by CoupleProvider
  useRealtime(DB.TABLES.SPACES, refetchSpace);

  function handleRefresh() {
    refetchCouple();
    refetchSpace();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.accent }]}>Nosotros</Text>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        <CoupleCard
          isComplete={isComplete}
          avatarUrl={avatarUrl}
          inviteCode={inviteCode}
          avatarsSlot={<AvatarStack avatars={avatars} size="large" />}
          statusSlot={
            <>
              {isActive && (
                <>
                  <Text style={[styles.statusTitle, { color: colors.accent }]}>Juntitos</Text>
                  <Text style={[styles.statusSub, { color: colors.accent }]}>Están conectados como pareja</Text>
                </>
              )}
              {isPaused && (
                <>
                  <Text style={[styles.statusTitle, { color: colors.accent }]}>Descansando</Text>
                  <Text style={[styles.statusSub, { color: colors.accent }]}>
                    {pausedBy === user?.id ? "Tú pediste el descanso. Puedes volver cuando quieras." : "Tu pareja pidió un descanso"}
                  </Text>
                </>
              )}
              {isPendingDelete && (
                <>
                  <Text style={[styles.statusTitle, { color: colors.accent }]}>Despidiéndose</Text>
                  <Text style={[styles.statusSub, { color: colors.accent }]}>
                    {deleteRequestedBy === user?.id
                      ? "Esperando a tu pareja o 24h para borrar todo"
                      : "Tu pareja quiere borrar el espacio"}
                  </Text>
                </>
              )}
            </>
          }
          onJoined={() => { refetchCouple(); refetchSpace(); }}
        />

        {isComplete && <PartnerSection />}
        <ThemeSection />
        {isComplete && <SpaceSection onMutate={handleRefresh} />}
        <AccountSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "300",
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  statusSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.6,
  },
});
