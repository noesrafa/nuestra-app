import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Reanimated from "react-native-reanimated";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useCouple } from "@/hooks/use-couple";
import { useRevealModal } from "@/hooks/use-reveal-modal";
import { useSongPlayer } from "@/hooks/use-song-player";
import { RevealModal } from "@/components/letter/reveal-modal";
import { GiftButton } from "@/components/letter/gift-button";
import type { Letter } from "@/lib/types";

type Props = {
  letter: Letter;
  onRead: () => void;
};

export function SongReveal({ letter, onRead }: Props) {
  const { colors, isDark } = useTheme();
  const { partnerNickname } = useCouple();
  const modal = useRevealModal();
  const song = useSongPlayer(letter.spotify_preview_url, letter.spotify_track_id, modal.open);

  const isUnread = !letter.read_at;
  const signText = partnerNickname || "con amor";

  async function handleOpen() {
    modal.handleOpen();
    onRead();
    await song.fetchPreview();
  }

  function handleClose() {
    song.pause();
    modal.handleClose();
  }

  return (
    <>
      <GiftButton isUnread={isUnread} onPress={handleOpen} />

      <RevealModal
        open={modal.open}
        overlayOpacity={modal.overlayOpacity}
        cardStyle={modal.cardStyle}
        onClose={handleClose}
        header={
          <View style={[styles.seal, { backgroundColor: colors.accent }]}>
            <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
          </View>
        }
      >
        <View style={[styles.content, { backgroundColor: isDark ? "#2A1520" : "#FFF8F0" }]}>
          <View style={styles.artworkOuter}>
            <Reanimated.View style={[styles.vinylWrap, song.vinylStyle]}>
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

          {letter.spotify_external_url && (
            <TouchableOpacity
              style={[styles.spotifyButton, { backgroundColor: "#1DB954" }]}
              onPress={() => Linking.openURL(letter.spotify_external_url!)}
              activeOpacity={0.8}
            >
              <Text style={styles.spotifyButtonText}>Abrir en Spotify</Text>
            </TouchableOpacity>
          )}
        </View>
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
});
