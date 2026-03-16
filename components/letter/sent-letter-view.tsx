import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { Letter } from "@/lib/types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  letter: Letter;
};

export function SentLetterView({ letter }: Props) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const wasRead = !!letter.read_at;

  const progress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  function handleOpen() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(true);
    progress.setValue(0);
    overlayOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(progress, {
        toValue: 1,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handleClose() {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setOpen(false));
  }

  const paperBg = isDark ? "#2A1520" : "#FFF8F0";
  const lineColor = isDark ? "rgba(212,99,138,0.12)" : "rgba(139,34,82,0.06)";

  const cardScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });
  const cardTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT * 0.15, 0],
  });
  const cardOpacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 1],
  });

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        style={[styles.sentButton, { backgroundColor: colors.accentLight }]}
      >
        <Ionicons name="mail" size={20} color={colors.accent} />
        {wasRead && (
          <View style={[styles.readCheck, { backgroundColor: colors.accent }]}>
            <Ionicons name="checkmark" size={8} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent statusBarTranslucent onRequestClose={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

          <Animated.View
            style={[
              styles.cardWrapper,
              {
                transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
                opacity: cardOpacity,
              },
            ]}
          >
            {/* Status badge */}
            <View style={[styles.badge, { backgroundColor: wasRead ? colors.accent : colors.accentLight }]}>
              <Ionicons
                name={wasRead ? "checkmark-done" : "time-outline"}
                size={14}
                color={wasRead ? "#FFFFFF" : colors.accent}
              />
              <Text style={[styles.badgeText, { color: wasRead ? "#FFFFFF" : colors.accent }]}>
                {wasRead ? "Ya la leyó" : "Aún no la abre"}
              </Text>
            </View>

            {/* Letter paper */}
            <View style={[styles.paper, { backgroundColor: paperBg }]}>
              {Array.from({ length: 10 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.line, { top: 24 + i * 30, backgroundColor: lineColor }]}
                />
              ))}

              <Text style={[styles.letterBody, { color: colors.text }]}>
                {letter.body}
              </Text>

              <View style={styles.signRow}>
                <View style={[styles.signLine, { backgroundColor: colors.accent }]} />
                <Text style={[styles.letterSign, { color: colors.accent }]}>
                  tu cartita
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.accent }]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
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
  paper: {
    width: "100%",
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    minHeight: 200,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  line: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    height: StyleSheet.hairlineWidth,
  },
  letterBody: {
    fontSize: 18,
    lineHeight: 30,
    fontStyle: "italic",
  },
  signRow: {
    alignItems: "flex-end",
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  signLine: {
    width: 40,
    height: 1,
    opacity: 0.3,
  },
  letterSign: {
    fontSize: 13,
    fontStyle: "italic",
    fontWeight: "500",
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
