import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
import { useCouple } from "@/hooks/use-couple";
import type { Letter } from "@/lib/types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  letter: Letter;
  onRead: () => void;
};

export function LetterReveal({ letter, onRead }: Props) {
  const { colors, isDark } = useTheme();
  const { partnerNickname } = useCouple();
  const [open, setOpen] = useState(false);
  const isUnread = !letter.read_at;
  const signText = partnerNickname || "con amor";

  const bounceY = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isUnread) return;

    const heartBlink = Animated.loop(
      Animated.sequence([
        Animated.timing(heartOpacity, { toValue: 0.2, duration: 400, useNativeDriver: true }),
        Animated.timing(heartOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    heartBlink.start();
    return () => heartBlink.stop();
  }, [isUnread, heartOpacity]);

  useEffect(() => {
    if (!isUnread) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(2500),
        // First jump up
        Animated.timing(bounceY, {
          toValue: -8,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(bounceY, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.delay(80),
        // Second smaller jump
        Animated.timing(bounceY, {
          toValue: -5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bounceY, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isUnread, bounceY]);

  // Single progress value drives the whole animation
  const progress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  function handleOpen() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setOpen(true);
    onRead();

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

  // Card scales up and slides from bottom
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
      <TouchableOpacity onPress={handleOpen} activeOpacity={0.7}>
        <Animated.View
          style={[
            styles.giftButton,
            { backgroundColor: colors.accentLight, transform: [{ translateY: bounceY }] },
          ]}
        >
          <Ionicons name="gift" size={22} color={colors.accent} />
          {isUnread && (
            <Animated.View style={[styles.unreadBadge, { backgroundColor: colors.accent, opacity: heartOpacity }]}>
              <Ionicons name="heart" size={7} color="#FFFFFF" />
            </Animated.View>
          )}
        </Animated.View>
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
            {/* Heart seal at top */}
            <View style={[styles.seal, { backgroundColor: colors.accent }]}>
              <Ionicons name="heart" size={16} color="#FFFFFF" />
            </View>

            {/* Letter paper */}
            <ScrollView
              style={[styles.paperScroll, { backgroundColor: paperBg }]}
              contentContainerStyle={styles.paperContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.letterBody, { color: colors.text }]}>
                {letter.body}
              </Text>

              <View style={styles.signRow}>
                <View style={[styles.signLine, { backgroundColor: colors.accent }]} />
                <Text style={[styles.letterSign, { color: colors.accent }]}>
                  {signText}
                </Text>
              </View>
            </ScrollView>

            {/* Close button */}
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
  giftButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadge: {
    position: "absolute",
    top: 0,
    right: 0,
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
  paperScroll: {
    width: "100%",
    borderRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.55,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  paperContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.lg,
    minHeight: 200,
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
