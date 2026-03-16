import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { spacing } from "@/constants/theme";
import { formatDisplayDate, getPhotoPrompt } from "@/lib/utils";
import { useCouple } from "@/hooks/use-couple";
import { useTheme } from "@/hooks/use-theme";
import { useEntryManager } from "@/hooks/use-entry-manager";
import { usePhotoUpload, type UploadContext } from "@/hooks/use-photo-upload";
import { useLetter } from "@/hooks/use-letter";
import { LetterReveal } from "@/components/letter/letter-reveal";
import { SentLetterView } from "@/components/letter/sent-letter-view";

type Props = {
  date: string;
  onChanged?: () => void;
  readOnly?: boolean;
};

export function DayDetailContent({ date, onChanged, readOnly }: Props) {
  const { colors, isDark } = useTheme();
  const { coupleId } = useCouple();
  const {
    entry, loading, title, hearts,
    loadEntry,
    onTitleChange, onHeartTap, deleteEntry,
  } = useEntryManager(date, onChanged);
  const { uploading, uploadStatus, smartPick } = usePhotoUpload();
  const { receivedLetter, sentLetter, markAsRead } = useLetter(date);

  const uploadCtx: UploadContext = {
    date, entry, coupleId, title, notes: "",
    onSuccess: () => { loadEntry(); onChanged?.(); },
  };

  function openWriteLetter() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(app)/letter/${date}`);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Action buttons row: pencil (write) | heart | gift (read)
  function renderActions() {
    if (readOnly || uploading) {
      if (uploading) {
        return (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>{uploadStatus}</Text>
          </View>
        );
      }
      // readOnly: still show gift if there's a received letter
      if (receivedLetter) {
        return (
          <View style={styles.actionsRow}>
            <LetterReveal letter={receivedLetter} onRead={markAsRead} />
          </View>
        );
      }
      return null;
    }

    return (
      <View style={styles.actionsRow}>
        {sentLetter ? (
          <SentLetterView letter={sentLetter} />
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accentLight }]}
            onPress={openWriteLetter}
          >
            <Ionicons name="pencil" size={20} color={colors.accent} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.accentLight }]}
          onPress={onHeartTap}
        >
          <Ionicons name="heart" size={22} color={colors.accent} />
        </TouchableOpacity>

        {receivedLetter && (
          <LetterReveal letter={receivedLetter} onRead={markAsRead} />
        )}
      </View>
    );
  }

  return (
    <>
      <Text style={[styles.dateLabel, { color: colors.accent }]}>
        {formatDisplayDate(date)}
      </Text>
      <View style={styles.dividerWrap}>
        <View style={[styles.divider, { backgroundColor: colors.accent }]} />
      </View>

      {entry?.photo_url ? (
        <View style={styles.photoContainer}>
          {hearts > 0 && (
            <View style={styles.heartsRow}>
              <Ionicons name="heart" size={16} color={colors.accent} />
              <Text style={[styles.heartsCount, { color: colors.accent }]}>{hearts}</Text>
            </View>
          )}

          <Pressable onPress={readOnly ? undefined : deleteEntry} style={styles.photoPress}>
            <View style={[styles.polaroid, { backgroundColor: isDark ? colors.accentLight : "#FFFFFF" }]}>
              <Image
                source={{ uri: entry.photo_url }}
                style={styles.photo}
                contentFit="cover"
                transition={300}
              />
            </View>
          </Pressable>

          {renderActions()}
        </View>
      ) : readOnly ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.promptHint, { color: colors.textSecondary, paddingVertical: spacing.xl }]}>
            Sin foto para este día
          </Text>
          {receivedLetter && (
            <View style={styles.actionsRow}>
              <LetterReveal letter={receivedLetter} onRead={markAsRead} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          {uploading ? (
            <View style={styles.uploadingCol}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.uploadStatusText}>{uploadStatus}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.promptArea}
                onPress={() => smartPick(uploadCtx)}
                activeOpacity={0.7}
              >
                {/* Empty polaroid placeholder */}
                <View style={[styles.emptyPolaroid, { backgroundColor: isDark ? colors.accentLight : "#FFFFFF" }]}>
                  <View style={[styles.emptyPhotoSlot, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                    <Ionicons name="camera-outline" size={28} color={colors.accent} style={{ opacity: 0.25 }} />
                  </View>
                  <View style={styles.polaroidCaption}>
                    <Text style={[styles.promptText, { color: isDark ? colors.text : "#2D2D2D" }]} numberOfLines={1}>
                      {getPhotoPrompt(date)} <Ionicons name="heart" size={13} color="#FFFFFF" />
                    </Text>
                    <Text style={[styles.promptHint, { color: isDark ? colors.textSecondary : "#999" }]}>
                      Toca para agregar foto
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {renderActions()}
            </>
          )}
        </View>
      )}

    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "capitalize",
    letterSpacing: 0.3,
  },
  dividerWrap: {
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  divider: {
    width: 1,
    height: 24,
    opacity: 0.3,
  },
  photoContainer: {
    alignItems: "center",
  },
  photoPress: {
    alignItems: "center",
  },
  polaroid: {
    padding: 8,
    paddingBottom: 48,
    borderRadius: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ rotate: "-3deg" }],
  },
  photo: {
    width: 220,
    height: 260,
  },
  heartsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.sm,
  },
  heartsCount: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusText: {
    fontSize: 14,
  },
  emptyContainer: {
    gap: spacing.md,
  },
  promptArea: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  emptyPolaroid: {
    padding: 8,
    paddingBottom: 12,
    borderRadius: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    transform: [{ rotate: "-3deg" }],
  },
  emptyPhotoSlot: {
    width: 200,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  polaroidCaption: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  promptText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  promptHint: {
    fontSize: 11,
    textAlign: "center",
  },
  uploadingCol: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  uploadStatusText: {
    fontSize: 14,
  },
});
