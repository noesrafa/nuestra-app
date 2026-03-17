import { useEffect, useRef } from "react";
import { TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  isUnread: boolean;
  onPress: () => void;
};

export function GiftButton({ isUnread, onPress }: Props) {
  const { colors } = useTheme();

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
        Animated.timing(bounceY, { toValue: -8, duration: 120, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.delay(80),
        Animated.timing(bounceY, { toValue: -5, duration: 100, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue: 0, duration: 100, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isUnread, bounceY]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
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
});
