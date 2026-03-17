import { View, Text, StyleSheet } from "react-native";
import { spacing, SEMANTIC_COLORS } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useSpace } from "@/hooks/use-space";
import { useCouple } from "@/hooks/use-couple";
import { useSpaceActions } from "@/hooks/use-space-actions";
import { CardRow } from "@/components/ui/card-row";

type Props = {
  onClose?: () => void;
  onMutate?: () => void;
};

export function SpaceSection({ onClose, onMutate }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { refetch: refetchCouple } = useCouple();
  const {
    isActive, isPaused, isPendingDelete,
    pausedBy, deleteRequestedBy, canFinalizeDelete,
    refetch: refetchSpace,
  } = useSpace();
  const {
    spaceLoading,
    handlePauseSpace, handleUnpauseSpace,
    handleRequestDelete, handleCancelDelete,
    deleteSpaceWithPhotos,
  } = useSpaceActions({ refetchCouple, refetchSpace, onClose, onMutate });

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.accent }]}>ESPACIO</Text>
      <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
        {isActive && (
          <CardRow
            icon="pause-circle-outline"
            iconColor={colors.accent}
            text="Tomar un descanso"
            onPress={handlePauseSpace}
            loading={spaceLoading}
            disabled={spaceLoading}
          />
        )}
        {isPaused && pausedBy === user?.id && (
          <CardRow
            icon="play-circle-outline"
            iconColor={colors.accent}
            text="Volver a estar juntos"
            onPress={handleUnpauseSpace}
            loading={spaceLoading}
            disabled={spaceLoading}
          />
        )}
        {(isPaused || isPendingDelete) && (
          <>
            {(isPaused || (isPendingDelete && deleteRequestedBy !== user?.id)) && (
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            )}
            {isPendingDelete && canFinalizeDelete && (
              <CardRow
                icon="trash-outline"
                iconColor={SEMANTIC_COLORS.DANGER}
                text="Borrar todo para siempre"
                textColor={SEMANTIC_COLORS.DANGER}
                onPress={deleteSpaceWithPhotos}
                loading={spaceLoading}
                disabled={spaceLoading}
              />
            )}
            {isPendingDelete && !canFinalizeDelete && deleteRequestedBy !== user?.id && (
              <CardRow
                icon="trash-outline"
                iconColor={SEMANTIC_COLORS.DANGER}
                text="Sí, borrar todo"
                textColor={SEMANTIC_COLORS.DANGER}
                onPress={deleteSpaceWithPhotos}
                loading={spaceLoading}
                disabled={spaceLoading}
              />
            )}
            {isPendingDelete && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <CardRow
                  icon="close-circle-outline"
                  iconColor={colors.textSecondary}
                  text="No, mejor no"
                  textColor={colors.textSecondary}
                  onPress={handleCancelDelete}
                  disabled={spaceLoading}
                />
              </>
            )}
            {isPaused && (
              <CardRow
                icon="trash-outline"
                iconColor={SEMANTIC_COLORS.DANGER}
                text="Borrar todo"
                textColor={SEMANTIC_COLORS.DANGER}
                onPress={handleRequestDelete}
                disabled={spaceLoading}
              />
            )}
          </>
        )}
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
