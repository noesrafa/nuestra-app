import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { spacing, SEMANTIC_COLORS } from "@/constants/theme";
import { formatDisplayDate } from "@/lib/utils";
import { useCouple } from "@/hooks/use-couple";
import { useTheme } from "@/hooks/use-theme";
import { useEntryManager } from "@/hooks/use-entry-manager";
import { usePhotoUpload, type UploadContext } from "@/hooks/use-photo-upload";
import { GradientButton } from "@/components/ui/gradient-button";

type Props = {
  date: string;
  onChanged?: () => void;
  readOnly?: boolean;
  refreshKey?: number;
};

export function DayDetailContent({ date, onChanged, readOnly, refreshKey }: Props) {
  const { colors, isDark } = useTheme();
  const { coupleId } = useCouple();
  const {
    entry, loading, title, hearts,
    loadEntry,
    onTitleChange, onHeartTap, deleteEntry,
  } = useEntryManager(date, onChanged, refreshKey);
  const { uploading, uploadStatus, pickFromGallery, pasteFromClipboard } = usePhotoUpload();

  const uploadCtx: UploadContext = {
    date, entry, coupleId, title, notes: "",
    onSuccess: () => { loadEntry(); onChanged?.(); },
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
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

          <Pressable onPress={readOnly ? undefined : onHeartTap} style={styles.photoPress}>
            <View style={[styles.polaroid, { backgroundColor: isDark ? colors.accentLight : "#FFFFFF" }]}>
              <Image
                source={{ uri: entry.photo_url }}
                style={styles.photo}
                contentFit="cover"
                transition={300}
              />
            </View>
          </Pressable>

          {readOnly ? null : uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>{uploadStatus}</Text>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => pickFromGallery(uploadCtx)}>
                <Ionicons name="images-outline" size={18} color={colors.accent} />
                <Text style={[styles.actionButtonText, { color: colors.accent }]}>Galería</Text>
              </TouchableOpacity>
              {Platform.OS === "ios" && (
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => pasteFromClipboard(uploadCtx)}>
                  <Ionicons name="clipboard-outline" size={18} color={colors.accent} />
                  <Text style={[styles.actionButtonText, { color: colors.accent }]}>Pegar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={deleteEntry}>
                <Ionicons name="trash-outline" size={18} color={SEMANTIC_COLORS.DANGER} />
                <Text style={[styles.actionButtonText, { color: SEMANTIC_COLORS.DANGER }]}>Borrar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : readOnly ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.uploadText, { color: colors.textSecondary, textAlign: "center", paddingVertical: spacing.xl }]}>
            Sin foto para este día
          </Text>
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
                style={[styles.uploadArea, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => pickFromGallery(uploadCtx)}
                activeOpacity={0.7}
              >
                <Text style={[styles.uploadIcon, { color: colors.accent }]}>+</Text>
                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Elegir de galería</Text>
              </TouchableOpacity>

              {Platform.OS === "ios" && (
                <GradientButton
                  label="Pegar foto"
                  icon={<Ionicons name="heart" size={18} color="#FFFFFF" />}
                  onPress={() => pasteFromClipboard(uploadCtx)}
                />
              )}
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
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
  uploadArea: {
    height: 200,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingCol: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  uploadStatusText: {
    fontSize: 14,
  },
  uploadIcon: {
    fontSize: 48,
    fontWeight: "300",
    marginBottom: spacing.sm,
  },
  uploadText: {
    fontSize: 16,
  },
});
