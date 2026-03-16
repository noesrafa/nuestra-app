import { Text } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useCouple } from "@/hooks/use-couple";
import { useSpace } from "@/hooks/use-space";
import { useProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { CoupleCard } from "./couple-card";
import { SpaceSection } from "./space-section";
import { ThemeSection } from "./theme-section";
import { AccountSection } from "./account-section";

type Props = {
  onClose: () => void;
  onMutate?: () => void;
};

export function CoupleDrawerContent({ onClose, onMutate }: Props) {
  const { user } = useAuth();
  const { avatarUrl } = useProfile(user?.id);
  const { colors } = useTheme();
  const { inviteCode, isComplete, avatars, refetch: refetchCouple } = useCouple();
  const { isActive, isPaused, isPendingDelete, pausedBy, deleteRequestedBy } = useSpace();

  function handleJoined() {
    refetchCouple();
    onMutate?.();
    onClose();
  }

  return (
    <>
      <CoupleCard
        isComplete={isComplete}
        avatarUrl={avatarUrl}
        inviteCode={inviteCode}
        avatarsSlot={<AvatarStack avatars={avatars} size="large" />}
        statusSlot={
          <>
            {isActive && (
              <>
                <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 4, color: colors.text }}>Vinculados</Text>
                <Text style={{ fontSize: 14, textAlign: "center", lineHeight: 20, color: colors.textSecondary }}>Ya estan conectados como pareja</Text>
              </>
            )}
            {isPaused && (
              <>
                <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 4, color: colors.text }}>Espacio en pausa</Text>
                <Text style={{ fontSize: 14, textAlign: "center", lineHeight: 20, color: colors.textSecondary }}>
                  {pausedBy === user?.id ? "Pausaste el espacio. Podés reactivarlo." : "Tu pareja pausó el espacio"}
                </Text>
              </>
            )}
            {isPendingDelete && (
              <>
                <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 4, color: colors.text }}>Eliminación pendiente</Text>
                <Text style={{ fontSize: 14, textAlign: "center", lineHeight: 20, color: colors.textSecondary }}>
                  {deleteRequestedBy === user?.id
                    ? "Esperando confirmación de tu pareja o 24h"
                    : "Tu pareja quiere eliminar el espacio"}
                </Text>
              </>
            )}
          </>
        }
        onJoined={handleJoined}
      />

      {isComplete && <SpaceSection onClose={onClose} onMutate={onMutate} />}
      <ThemeSection />
      <AccountSection onClose={onClose} />
    </>
  );
}
