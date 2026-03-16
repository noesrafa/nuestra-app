import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import Animated from "react-native-reanimated";
import { spacing } from "@/constants/theme";
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
};

export function DayDetailContent({ date, onChanged, readOnly }: Props) {
  const { colors } = useTheme();
  const { coupleId } = useCouple();
  const {
    entry, loading, title, notes, hearts,
    animatedPhotoStyle, loadEntry,
    onTitleChange, onNotesChange, onHeartTap, deleteEntry,
  } = useEntryManager(date, onChanged);
  const { uploading, uploadStatus, pickFromGallery, pasteFromClipboard } = usePhotoUpload();

  const uploadCtx: UploadContext = {
    date, entry, coupleId, title, notes,
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
      <TextInput
        style={[styles.titleInput, { color: colors.text }]}
        value={title}
        onChangeText={onTitleChange}
        placeholder={formatDisplayDate(date)}
        placeholderTextColor={colors.textSecondary}
        maxLength={100}
        editable={!readOnly}
      />

      {entry?.photo_url ? (
        <View style={styles.photoContainer}>
          <Pressable onPress={readOnly ? undefined : onHeartTap} style={styles.photoPress}>
            <Animated.View style={[styles.photoWrap, animatedPhotoStyle]}>
              <Image
                source={{ uri: entry.photo_url }}
                style={styles.photo}
                contentFit="contain"
                transition={300}
              />
            </Animated.View>
          </Pressable>

          {hearts > 0 && (
            <View style={styles.heartsRow}>
              <Image source={require("../assets/icons-3d/heart.png")} style={{ width: 18, height: 18 }} contentFit="contain" />
              <Text style={[styles.heartsCount, { color: colors.accent }]}>{hearts}</Text>
            </View>
          )}

          {readOnly ? null : uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>{uploadStatus}</Text>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={() => pickFromGallery(uploadCtx)}>
                <Text style={[styles.actionButtonText, { color: colors.accent }]}>Galería</Text>
              </TouchableOpacity>
              {Platform.OS === "ios" && (
                <TouchableOpacity style={styles.actionButton} onPress={() => pasteFromClipboard(uploadCtx)}>
                  <Text style={[styles.actionButtonText, { color: colors.accent }]}>Pegar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionButton} onPress={deleteEntry}>
                <Text style={styles.actionButtonTextDanger}>Borrar</Text>
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
                  icon={<Image source={require("../assets/icons-3d/heart.png")} style={{ width: 20, height: 20 }} contentFit="contain" />}
                  onPress={() => pasteFromClipboard(uploadCtx)}
                />
              )}
            </>
          )}
        </View>
      )}

      <TextInput
        style={[styles.notesInput, { color: colors.text }]}
        value={notes}
        onChangeText={onNotesChange}
        placeholder={readOnly ? "" : "Agregar una nota..."}
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={500}
        textAlignVertical="top"
        editable={!readOnly}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.md,
    textTransform: "capitalize",
    paddingVertical: spacing.xs,
  },
  photoContainer: {
    alignItems: "center",
  },
  photoPress: {
    width: "100%",
  },
  photoWrap: {
    width: "100%",
  },
  photo: {
    width: "100%",
    height: 400,
  },
  heartsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  heartsCount: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  actionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  actionButtonTextDanger: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "500",
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
  notesInput: {
    fontSize: 15,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 80,
    lineHeight: 22,
  },
});
