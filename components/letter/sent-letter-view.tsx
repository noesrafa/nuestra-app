import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useRevealModal } from "@/hooks/use-reveal-modal";
import { RevealModal } from "@/components/letter/reveal-modal";
import { LetterPaper } from "@/components/letter/letter-paper";
import type { Letter } from "@/lib/types";

type Props = {
  letter: Letter;
  autoOpen?: boolean;
};

export function SentLetterView({ letter, autoOpen }: Props) {
  const { colors } = useTheme();
  const modal = useRevealModal(Haptics.ImpactFeedbackStyle.Light);
  const wasRead = !!letter.read_at;
  const didAutoOpen = useRef(false);

  useEffect(() => {
    if (autoOpen && !didAutoOpen.current) {
      didAutoOpen.current = true;
      setTimeout(() => modal.handleOpen(), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  return (
    <>
      <TouchableOpacity
        onPress={() => modal.handleOpen()}
        activeOpacity={0.7}
        style={[styles.sentButton, { backgroundColor: colors.accentLight }]}
      >
        <Ionicons name="mail" size={20} color={colors.accent} />
        {wasRead && (
          <View style={[styles.readCheck, { backgroundColor: colors.accent }]}>
            <Ionicons name="checkmark" size={8} color={colors.textOnAccent} />
          </View>
        )}
      </TouchableOpacity>

      <RevealModal
        open={modal.open}
        overlayOpacity={modal.overlayOpacity}
        cardStyle={modal.cardStyle}
        onClose={() => modal.handleClose()}
        header={
          <View style={[styles.badge, { backgroundColor: wasRead ? colors.accent : colors.accentLight }]}>
            <Ionicons
              name={wasRead ? "checkmark-done" : "time-outline"}
              size={14}
              color={wasRead ? colors.textOnAccent : colors.accent}
            />
            <Text style={[styles.badgeText, { color: wasRead ? colors.textOnAccent : colors.accent }]}>
              {wasRead ? "Ya la leyó" : "Aún no la abre"}
            </Text>
          </View>
        }
      >
        <LetterPaper body={letter.body} signText="tu cartita" />
      </RevealModal>
    </>
  );
}

const styles = StyleSheet.create({
  sentButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  readCheck: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
