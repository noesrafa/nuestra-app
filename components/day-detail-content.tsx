import { useState, useEffect, useRef, useCallback } from "react";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { spacing } from "@/constants/theme";
import { useCouple } from "@/hooks/use-couple";
import { useTheme } from "@/hooks/use-theme";

type Entry = {
  id: string;
  date: string;
  title: string;
  photo_url: string | null;
  notes: string | null;
  hearts: number;
};

function formatDisplayDate(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type Props = {
  date: string;
  onChanged?: () => void;
};

export function DayDetailContent({ date, onChanged }: Props) {
  const { colors } = useTheme();
  const { coupleId } = useCouple();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [title, setTitle] = useState(formatDisplayDate(date));
  const [notes, setNotes] = useState("");
  const [hearts, setHearts] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const photoScale = useSharedValue(1);

  const animatedPhotoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
  }));

  const loadEntry = useCallback(async () => {
    const { data } = await supabase
      .from("nuestra_entries")
      .select("id, date, title, photo_url, notes, hearts")
      .eq("date", date)
      .maybeSingle();

    if (data && data.photo_url && !data.photo_url.startsWith("http")) {
      const { data: signed } = await supabase.storage
        .from("nuestra-photos")
        .createSignedUrl(data.photo_url, 3600);
      if (signed?.signedUrl) data.photo_url = signed.signedUrl;
    }

    setEntry(data);
    if (data) {
      setTitle(data.title);
      setNotes(data.notes ?? "");
      setHearts(data.hearts ?? 0);
    } else {
      setTitle(formatDisplayDate(date));
      setNotes("");
      setHearts(0);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    setLoading(true);
    loadEntry();
  }, [loadEntry]);

  function debounceSave(updates: Record<string, unknown>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (entry) {
        await supabase
          .from("nuestra_entries")
          .update(updates)
          .eq("id", entry.id);
        onChanged?.();
      }
    }, 1000);
  }

  function onTitleChange(text: string) {
    setTitle(text);
    if (entry) debounceSave({ title: text });
  }

  function onNotesChange(text: string) {
    setNotes(text);
    if (entry) debounceSave({ notes: text });
  }

  async function onHeartTap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Bounce animation
    photoScale.value = withSequence(
      withSpring(1.05, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 6, stiffness: 200 })
    );

    const newHearts = hearts + 1;
    setHearts(newHearts);

    if (entry) {
      await supabase
        .from("nuestra_entries")
        .update({ hearts: newHearts })
        .eq("id", entry.id);
      onChanged?.();
    }
  }

  async function uploadPhoto(imageSource: string) {
    setUploading(true);

    try {
      setUploadStatus("Optimizando...");
      const resized = await manipulateAsync(
        imageSource,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: SaveFormat.WEBP }
      );

      setUploadStatus("Subiendo foto...");
      const fileName = `${date}.webp`;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const filePath = `${user.id}/${fileName}`;

      const formData = new FormData();
      formData.append("file", {
        uri: resized.uri,
        name: fileName,
        type: "image/webp",
      } as unknown as Blob);

      const { error: uploadError } = await supabase.storage
        .from("nuestra-photos")
        .upload(filePath, formData, { upsert: true });

      if (uploadError) {
        Alert.alert("Error al subir", uploadError.message);
        return;
      }

      setUploadStatus("Guardando...");
      if (entry) {
        const { error } = await supabase
          .from("nuestra_entries")
          .update({ photo_url: filePath })
          .eq("id", entry.id);
        if (error) {
          Alert.alert("Error", error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("nuestra_entries").insert({
          couple_id: coupleId,
          date,
          title: title || formatDisplayDate(date),
          photo_url: filePath,
          notes: notes || null,
          created_by: user.id,
        });
        if (error) {
          Alert.alert("Error", error.message);
          return;
        }
      }

      loadEntry();
      onChanged?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      Alert.alert("Error", message);
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  }

  async function deleteEntry() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Borrar foto", "¿Seguro que querés borrar esta entrada?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          if (!entry) return;
          await supabase.from("nuestra_entries").delete().eq("id", entry.id);
          setEntry(null);
          setTitle(formatDisplayDate(date));
          setNotes("");
          setHearts(0);
          onChanged?.();
        },
      },
    ]);
  }

  async function pickFromGallery() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tus fotos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (result.canceled) return;
    uploadPhoto(result.assets[0].uri);
  }

  async function pasteFromClipboard() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hasImage = await Clipboard.hasImageAsync();
    if (!hasImage) {
      Alert.alert(
        "Sin imagen",
        "No hay imagen en el portapapeles. Mantené presionada una foto en Fotos y tocá 'Copiar'."
      );
      return;
    }

    const clipboardImage = await Clipboard.getImageAsync({ format: "png" });
    if (!clipboardImage?.data) {
      Alert.alert("Error", "No se pudo leer la imagen del portapapeles");
      return;
    }

    const raw = clipboardImage.data;
    const base64 = raw.includes(",") ? raw : `data:image/png;base64,${raw}`;
    uploadPhoto(base64);
  }

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
      />

      {entry?.photo_url ? (
        <View style={styles.photoContainer}>
          <Pressable onPress={onHeartTap} style={styles.photoPress}>
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
              <Image
                source={require("../assets/icons-3d/heart.png")}
                style={{ width: 18, height: 18 }}
                contentFit="contain"
              />
              <Text style={[styles.heartsCount, { color: colors.accent }]}>{hearts}</Text>
            </View>
          )}

          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>{uploadStatus}</Text>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={pickFromGallery}>
                <Text style={[styles.actionButtonText, { color: colors.accent }]}>Galería</Text>
              </TouchableOpacity>
              {Platform.OS === "ios" && (
                <TouchableOpacity style={styles.actionButton} onPress={pasteFromClipboard}>
                  <Text style={[styles.actionButtonText, { color: colors.accent }]}>Pegar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionButton} onPress={deleteEntry}>
                <Text style={styles.actionButtonTextDanger}>Borrar</Text>
              </TouchableOpacity>
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
                style={[styles.uploadArea, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={pickFromGallery}
                activeOpacity={0.7}
              >
                <Text style={[styles.uploadIcon, { color: colors.accent }]}>+</Text>
                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Elegir de galería</Text>
              </TouchableOpacity>

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  onPress={pasteFromClipboard}
                  activeOpacity={0.8}
                  style={styles.pasteButtonWrap}
                >
                  <LinearGradient
                    colors={["#F7A9BB", "#F36581"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.pasteButtonGradient}
                  >
                    <Image source={require("../assets/icons-3d/heart.png")} style={{ width: 20, height: 20 }} contentFit="contain" />
                    <Text style={styles.pasteButtonText}>Pegar foto</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      <TextInput
        style={[styles.notesInput, { color: colors.text }]}
        value={notes}
        onChangeText={onNotesChange}
        placeholder="Agregar una nota..."
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={500}
        textAlignVertical="top"
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
    color: "#FF3B30",
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
  pasteButtonWrap: {
    borderRadius: 28,
    overflow: "hidden",
  },
  pasteButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
  },
  pasteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  notesInput: {
    fontSize: 15,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 80,
    lineHeight: 22,
  },
});
