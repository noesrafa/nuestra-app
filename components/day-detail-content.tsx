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
import { spacing } from "@/constants/theme";
import { formatDisplayDate } from "@/lib/utils";
import { useCouple } from "@/hooks/use-couple";
import { useTheme } from "@/hooks/use-theme";
import { useEntryManager } from "@/hooks/use-entry-manager";
import { usePhotoUpload, type UploadContext } from "@/hooks/use-photo-upload";

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
            <TouchableOpacity style={styles.deleteButton} onPress={deleteEntry}>
              <Ionicons name="trash-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
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
            <TouchableOpacity
              style={[styles.uploadArea, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => smartPick(uploadCtx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.uploadIcon, { color: colors.accent }]}>+</Text>
              <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Agregar foto</Text>
            </TouchableOpacity>
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
  deleteButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
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
