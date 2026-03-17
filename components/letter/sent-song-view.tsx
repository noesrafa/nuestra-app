import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Reanimated from "react-native-reanimated";
import { spacing, BRAND_COLORS } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useRevealModal } from "@/hooks/use-reveal-modal";
import { useSongPlayer } from "@/hooks/use-song-player";
import { RevealModal } from "@/components/letter/reveal-modal";
import type { Letter } from "@/lib/types";

type Props = {
  letter: Letter;
};

export function SentSongView({ letter }: Props) {
  const { colors } = useTheme();
  const modal = useRevealModal(Haptics.ImpactFeedbackStyle.Light);
  const song = useSongPlayer(letter.spotify_preview_url, letter.spotify_track_id, modal.open);
  const wasRead = !!letter.read_at;

  async function handleOpen() {
    modal.handleOpen();
    await song.fetchPreview();
  }

  function handleClose() {
    song.pause();
    modal.handleClose();
  }

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        style={[styles.sentButton, { backgroundColor: colors.accentLight }]}
      >
        <Ionicons name="musical-notes" size={20} color={colors.accent} />
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
        onClose={handleClose}
        header={
          <View style={[styles.badge, { backgroundColor: wasRead ? colors.accent : colors.accentLight }]}>
            <Ionicons
              name={wasRead ? "checkmark-done" : "time-outline"}
              size={14}
              color={wasRead ? colors.textOnAccent : colors.accent}
            />
            <Text style={[styles.badgeText, { color: wasRead ? colors.textOnAccent : colors.accent }]}>
              {wasRead ? "Ya la escuchó" : "Aún no la abre"}
            </Text>
          </View>
        }
      >
        <View style={[styles.content, { backgroundColor: colors.paper }]}>
          <Reanimated.View style={[styles.vinylWrap, song.vinylStyle]}>
            <Image
              source={{ uri: letter.spotify_artwork_url ?? undefined }}
              style={styles.artwork}
              contentFit="cover"
              transition={300}
            />
          </Reanimated.View>

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
            <Text style={[styles.signText, { color: colors.accent }]}>tu canción</Text>
          </View>

          {letter.spotify_external_url && (
            <TouchableOpacity
              style={[styles.spotifyButton, { backgroundColor: BRAND_COLORS.SPOTIFY }]}
              onPress={() => Linking.openURL(letter.spotify_external_url!)}
              activeOpacity={0.8}
            >
              <Text style={[styles.spotifyButtonText, { color: colors.textOnAccent }]}>Abrir en Spotify</Text>
            </TouchableOpacity>
          )}
        </View>
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
  content: {
    width: "100%",
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  vinylWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  artwork: {
    width: 140,
    height: 140,
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
    fontSize: 14,
    fontWeight: "600",
  },
});
