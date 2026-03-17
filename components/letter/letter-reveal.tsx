import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/use-theme";
import { useCouple } from "@/hooks/use-couple";
import { useRevealModal } from "@/hooks/use-reveal-modal";
import { RevealModal } from "@/components/letter/reveal-modal";
import { LetterPaper } from "@/components/letter/letter-paper";
import { GiftButton } from "@/components/letter/gift-button";
import type { Letter } from "@/lib/types";

type Props = {
  letter: Letter;
  onRead: () => void;
};

export function LetterReveal({ letter, onRead }: Props) {
  const { colors } = useTheme();
  const { partnerNickname } = useCouple();
  const modal = useRevealModal();

  const isUnread = !letter.read_at;

  function handleOpen() {
    modal.handleOpen();
    onRead();
  }

  return (
    <>
      <GiftButton isUnread={isUnread} onPress={handleOpen} />

      <RevealModal
        open={modal.open}
        overlayOpacity={modal.overlayOpacity}
        cardStyle={modal.cardStyle}
        onClose={() => modal.handleClose()}
        header={
          <View style={[styles.seal, { backgroundColor: colors.accent }]}>
            <Ionicons name="heart" size={16} color="#FFFFFF" />
          </View>
        }
      >
        <LetterPaper body={letter.body} signText={partnerNickname || "con amor"} />
      </RevealModal>
    </>
  );
}

const styles = StyleSheet.create({
  seal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -20,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
