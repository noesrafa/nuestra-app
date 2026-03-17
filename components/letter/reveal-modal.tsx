import { type ReactNode } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  open: boolean;
  overlayOpacity: Animated.Value;
  cardStyle: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  onClose: () => void;
  header?: ReactNode;
  children: ReactNode;
};

export function RevealModal({ open, overlayOpacity, cardStyle, onClose, header, children }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={open} transparent statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.cardWrapper, cardStyle]}>
          {header}
          {children}

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.accent }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color={colors.textOnAccent} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapper: {
    width: "82%",
    alignItems: "center",
  },
  closeButton: {
    marginTop: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
