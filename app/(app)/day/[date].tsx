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
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";
import { removeBackground } from "@/lib/remove-bg";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, moods, type Mood } from "@/constants/theme";
import { useRealtimeEntries } from "@/hooks/use-realtime-entries";
import { useCouple } from "@/hooks/use-couple";
import { useTheme } from "@/hooks/use-theme";

type Entry = {
  id: string;
  date: string;
  title: string;
  photo_url: string | null;
  notes: string | null;
  mood: Mood | null;
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

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { colors } = useTheme();
  const { coupleId } = useCouple();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadEntry = useCallback(async () => {
    const { data } = await supabase
      .from("nuestra_entries")
      .select("id, date, title, photo_url, notes, mood")
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
      setMood(data.mood as Mood | null);
    } else {
      setTitle(formatDisplayDate(date));
      setNotes("");
      setMood(null);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  useRealtimeEntries(loadEntry);

  function debounceSave(updates: Record<string, unknown>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (entry) {
        await supabase
          .from("nuestra_entries")
          .update(updates)
          .eq("id", entry.id);
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

  async function onMoodSelect(selected: Mood) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMood = mood === selected ? null : selected;
    setMood(newMood);

    if (entry) {
      await supabase
        .from("nuestra_entries")
        .update({ mood: newMood })
        .eq("id", entry.id);
    } else {
      // Create entry with just mood
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("nuestra_entries")
        .insert({
          couple_id: coupleId,
          date,
          title: title || formatDisplayDate(date),
          mood: newMood,
          created_by: user.id,
        })
        .select("id, date, title, photo_url, notes, mood")
        .single();

      if (data) setEntry(data);
    }
  }

  async function uploadBase64(base64: string) {
    setUploading(true);
    try {
      setUploadStatus("Subiendo foto...");
      const fileName = `${date}.png`;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const filePath = `${user.id}/${fileName}`;

      const sizeKb = (base64.length * 3) / 4 / 1024;

      if (sizeKb > 500) {
        const resized = await manipulateAsync(
          `data:image/png;base64,${base64}`,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: SaveFormat.PNG }
        );
        const formData = new FormData();
        formData.append("file", {
          uri: resized.uri,
          name: fileName,
          type: "image/png",
        } as unknown as Blob);

        const { error: uploadError } = await supabase.storage
          .from("nuestra-photos")
          .upload(filePath, formData, { upsert: true });

        if (uploadError) {
          Alert.alert("Error al subir", uploadError.message);
          return;
        }
      } else {
        const uploadBytes = base64ToBytes(base64);

        const { error: uploadError } = await supabase.storage
          .from("nuestra-photos")
          .upload(filePath, uploadBytes, { contentType: "image/png", upsert: true });

        if (uploadError) {
          Alert.alert("Error al subir", uploadError.message);
          return;
        }
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
          mood,
          notes: notes || null,
          created_by: user.id,
        });
        if (error) {
          Alert.alert("Error", error.message);
          return;
        }
      }

      loadEntry();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      Alert.alert("Error", message);
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  }

  function base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function uploadAndSave(imageSource: string, skipBgRemoval: boolean) {
    setUploading(true);

    try {
      let fileUri: string | null = null;
      let base64Data: string | null = null;

      if (!skipBgRemoval) {
        setUploadStatus("Optimizando...");
        const resized = await manipulateAsync(
          imageSource,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );

        setUploadStatus("Quitando fondo...");
        const processed = await removeBackground(resized.uri);

        if (processed.startsWith("data:")) {
          base64Data = processed.split(",")[1];
        } else {
          fileUri = processed;
        }
      } else {
        fileUri = imageSource;
      }

      setUploadStatus("Subiendo foto...");
      const fileName = `${date}.png`;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const filePath = `${user.id}/${fileName}`;

      let uploadBody: FormData | Uint8Array;
      let uploadOptions: { contentType?: string; upsert: boolean };

      if (base64Data) {
        uploadBody = base64ToBytes(base64Data);
        uploadOptions = { contentType: "image/png", upsert: true };
      } else {
        const formData = new FormData();
        formData.append("file", {
          uri: fileUri,
          name: fileName,
          type: "image/png",
        } as unknown as Blob);
        uploadBody = formData;
        uploadOptions = { upsert: true };
      }

      const { error: uploadError } = await supabase.storage
        .from("nuestra-photos")
        .upload(filePath, uploadBody, uploadOptions);

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
          mood,
          notes: notes || null,
          created_by: user.id,
        });
        if (error) {
          Alert.alert("Error", error.message);
          return;
        }
      }

      loadEntry();
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
          setMood(null);
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
    uploadAndSave(result.assets[0].uri, false);
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
    const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
    uploadBase64(base64);
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          style={[styles.titleInput, { color: colors.text }]}
          value={title}
          onChangeText={onTitleChange}
          placeholder={formatDisplayDate(date)}
          placeholderTextColor={colors.textSecondary}
          maxLength={100}
        />

        {/* Mood selector */}
        <View style={styles.moodRow}>
          {(Object.keys(moods) as Mood[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.moodButton, mood === key && { borderColor: colors.accent, backgroundColor: colors.accentLight }]}
              onPress={() => onMoodSelect(key)}
              activeOpacity={0.7}
            >
              <Text style={styles.moodEmoji}>{moods[key].emoji}</Text>
              <Text
                style={[styles.moodLabel, { color: colors.textSecondary }, mood === key && { color: colors.accent, fontWeight: "600" }]}
              >
                {moods[key].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo */}
        {entry?.photo_url ? (
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: entry.photo_url }}
              style={styles.photo}
              contentFit="contain"
              transition={300}
            />
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
                      <Image source={require("../../../assets/icons-3d/heart.png")} style={{ width: 20, height: 20 }} contentFit="contain" />
                      <Text style={styles.pasteButtonText}>Pegar foto sin fondo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* Notes */}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.md,
    textTransform: "capitalize",
    paddingVertical: spacing.xs,
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  moodButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  photoContainer: {
    alignItems: "center",
  },
  photo: {
    width: "100%",
    height: 400,
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
