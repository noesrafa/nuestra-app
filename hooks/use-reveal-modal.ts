import { useState, useRef } from "react";
import { Animated, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function useRevealModal(hapticStyle: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Heavy) {
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  function handleOpen() {
    Haptics.impactAsync(hapticStyle);
    setOpen(true);
    progress.setValue(0);
    overlayOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(progress, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();
  }

  function handleClose(onClosed?: () => void) {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setOpen(false);
      onClosed?.();
    });
  }

  const cardScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const cardTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT * 0.15, 0] });
  const cardOpacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });

  return {
    open,
    overlayOpacity,
    cardStyle: {
      transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
      opacity: cardOpacity,
    },
    handleOpen,
    handleClose,
  };
}
