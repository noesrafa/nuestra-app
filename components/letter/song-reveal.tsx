import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
  Dimensions,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AudioPlayer, useAudioPlayer } from "expo-audio";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useCouple } from "@/hooks/use-couple";
import type { Letter } from "@/lib/types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  letter: Letter;
  onRead: () => void;
};

export function SongReveal({ letter, onRead }: Props) {
  const { colors, isDark } = useTheme();
  const { partnerNickname } = useCouple();
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(letter.spotify_preview_url);
  const player = useAudioPlayer(previewUrl ? { uri: previewUrl } : null);
  const isUnread = !letter.read_at;
  const signText = partnerNickname || "con amor";

  // Auto-play when modal opens and player is ready
  useEffect(() => {
    if (open && player && previewUrl) {
      try {
        player.seekTo(0);
        player.play();
      } catch {
        // Preview not available
      }
    }
  }, [open, player, previewUrl]);

  // Vinyl rotation
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (open) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [open]);

  const vinylStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Bounce animation for gift button
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

  // Modal animation
  const progress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  async function handleOpen() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setOpen(true);
    onRead();

    progress.setValue(0);
    overlayOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(progress, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();

    // Try to fetch preview URL if we don't have one
    if (!previewUrl && letter.spotify_track_id) {
      try {
        const res = await fetch(
          `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${letter.spotify_track_id}`
        );
        if (res.ok) {
          const data = await res.json();
          // oembed doesn't give preview_url directly, try embed page
          const embedRes = await fetch(
            `https://open.spotify.com/embed/track/${letter.spotify_track_id}`,
            { headers: { Accept: "text/html" } }
          );
          if (embedRes.ok) {
            const html = await embedRes.text();
            const match = html.match(/"audioPreview":\s*\{[^}]*"url":\s*"([^"]+)"/);
            if (match?.[1]) {
              setPreviewUrl(match[1]);
            }
          }
        }
      } catch {
        // No preview available
      }
    }

  }

  async function handleClose() {
    if (player) {
      player.pause();
    }

    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  }

  function openSpotify() {
    if (letter.spotify_external_url) {
      Linking.openURL(letter.spotify_external_url);
    }
  }

  const cardScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const cardTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT * 0.15, 0] });
  const cardOpacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });

  return (
    <>
      <TouchableOpacity onPress={handleOpen} activeOpacity={0.7}>
        <Animated.View
          style={[
            styles.giftButton,
            { backgroundColor: colors.accentLight, transform: [{ translateY: bounceY }] },
          ]}
        >
          <Ionicons name="musical-notes" size={22} color={colors.accent} />
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
            {/* Music note seal */}
            <View style={[styles.seal, { backgroundColor: colors.accent }]}>
              <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
            </View>

            {/* Content */}
            <View style={[styles.content, { backgroundColor: isDark ? "#2A1520" : "#FFF8F0" }]}>
              {/* Vinyl artwork */}
              <View style={styles.artworkOuter}>
                <Reanimated.View style={[styles.vinylWrap, vinylStyle]}>
                  <Image
                    source={{ uri: letter.spotify_artwork_url ?? undefined }}
                    style={styles.artwork}
                    contentFit="cover"
                    transition={300}
                  />
                </Reanimated.View>
              </View>

              <Text style={[styles.trackName, { color: colors.text }]}>
                {letter.spotify_track_name}
              </Text>
              <Text style={[styles.artistName, { color: colors.textSecondary }]}>
                {letter.spotify_artist_name}
              </Text>

              {letter.body ? (
                <Text style={[styles.dedication, { color: colors.text }]}>
                  {`\u201C${letter.body}\u201D`}
                </Text>
              ) : null}

              <View style={styles.signRow}>
                <View style={[styles.signLine, { backgroundColor: colors.accent }]} />
                <Text style={[styles.signText, { color: colors.accent }]}>{signText}</Text>
              </View>

              {/* Open in Spotify */}
              {letter.spotify_external_url && (
                <TouchableOpacity
                  style={[styles.spotifyButton, { backgroundColor: "#1DB954" }]}
                  onPress={openSpotify}
                  activeOpacity={0.8}
                >
                  <Text style={styles.spotifyButtonText}>Abrir en Spotify</Text>
                </TouchableOpacity>
              )}
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
  content: {
    width: "100%",
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  artworkOuter: {
    marginBottom: spacing.lg,
  },
  vinylWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  artwork: {
    width: 160,
    height: 160,
  },
  trackName: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  artistName: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  dedication: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  signRow: {
    alignItems: "flex-end",
    alignSelf: "flex-end",
    gap: spacing.xs,
  },
  signLine: {
    width: 40,
    height: 1,
    opacity: 0.3,
  },
  signText: {
    fontSize: 13,
    fontStyle: "italic",
    fontWeight: "500",
  },
  spotifyButton: {
    marginTop: spacing.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  spotifyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
