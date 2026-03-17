import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useCouple } from "@/hooks/use-couple";
import { useCoupleStats } from "@/hooks/use-couple-stats";

function formatSince(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es", { month: "long", year: "numeric" });
}

function daysTogether(dateStr: string | null): number {
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function ShareDrawerContent() {
  const { colors } = useTheme();
  const { avatars } = useCouple();
  const { stats, loading } = useCoupleStats();
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

  const days = daysTogether(stats.sinceDate);
  const cardBg = colors.paper;
  const cardAccent = colors.accent;

  async function handleShare() {
    if (!viewShotRef.current?.capture) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSharing(true);

    try {
      const uri = await viewShotRef.current.capture();
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Comparte tu historia",
      });
    } catch {
      // User cancelled or error
    } finally {
      setSharing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Nuestra historia</Text>

      {/* Capturable card */}
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {/* Avatars */}
          <View style={styles.avatarRow}>
            {avatars[0] && (
              <Image source={{ uri: avatars[0] }} style={[styles.avatar, { borderColor: cardAccent }]} contentFit="cover" />
            )}
            <View style={styles.heartBridge}>
              <Ionicons name="heart" size={20} color={cardAccent} />
            </View>
            {avatars[1] && (
              <Image source={{ uri: avatars[1] }} style={[styles.avatar, { borderColor: cardAccent }]} contentFit="cover" />
            )}
          </View>

          {/* Days counter */}
          <Text style={[styles.daysNumber, { color: cardAccent }]}>{days}</Text>
          <Text style={[styles.daysLabel, { color: cardAccent, opacity: 0.7 }]}>días juntos</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="camera" size={16} color={cardAccent} />
              <Text style={[styles.statNumber, { color: cardAccent }]}>{stats.totalPhotos}</Text>
              <Text style={[styles.statLabel, { color: cardAccent, opacity: 0.6 }]}>fotos</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: cardAccent, opacity: 0.15 }]} />
            <View style={styles.stat}>
              <Ionicons name="mail" size={16} color={cardAccent} />
              <Text style={[styles.statNumber, { color: cardAccent }]}>{stats.totalLetters}</Text>
              <Text style={[styles.statLabel, { color: cardAccent, opacity: 0.6 }]}>cartitas</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: cardAccent, opacity: 0.15 }]} />
            <View style={styles.stat}>
              <Ionicons name="heart" size={16} color={cardAccent} />
              <Text style={[styles.statNumber, { color: cardAccent }]}>{stats.totalHearts}</Text>
              <Text style={[styles.statLabel, { color: cardAccent, opacity: 0.6 }]}>corazones</Text>
            </View>
          </View>

          {/* Since */}
          {stats.sinceDate && (
            <Text style={[styles.since, { color: cardAccent, opacity: 0.5 }]}>
              desde {formatSince(stats.sinceDate)}
            </Text>
          )}

          {/* Branding */}
          <View style={styles.brandRow}>
            <View style={[styles.brandLine, { backgroundColor: cardAccent, opacity: 0.15 }]} />
            <Text style={[styles.brandText, { color: cardAccent, opacity: 0.4 }]}>nuestra</Text>
            <View style={[styles.brandLine, { backgroundColor: cardAccent, opacity: 0.15 }]} />
          </View>
        </View>
      </ViewShot>

      {/* Share button */}
      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: colors.accent }]}
        onPress={handleShare}
        disabled={sharing}
        activeOpacity={0.8}
      >
        {sharing ? (
          <ActivityIndicator color={colors.textOnAccent} size="small" />
        ) : (
          <>
            <Ionicons name="share-outline" size={18} color={colors.textOnAccent} />
            <Text style={[styles.shareText, { color: colors.textOnAccent }]}>Compartir</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "300",
    marginBottom: spacing.md,
  },
  card: {
    width: 280,
    borderRadius: 4,
    padding: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
  },
  heartBridge: {
    marginHorizontal: -6,
    zIndex: 1,
  },
  daysNumber: {
    fontSize: 48,
    fontWeight: "200",
    lineHeight: 52,
  },
  daysLabel: {
    fontSize: 14,
    fontWeight: "500",
    fontStyle: "italic",
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {
    alignItems: "center",
    gap: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "600",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  since: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  brandLine: {
    height: 1,
    width: 32,
  },
  brandText: {
    fontSize: 12,
    fontWeight: "600",
    fontStyle: "italic",
    letterSpacing: 2,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  shareText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
