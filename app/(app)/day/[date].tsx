import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";
import { removeBackground } from "@/lib/remove-bg";
import { colors, spacing } from "@/constants/theme";

type Entry = {
  id: string;
  date: string;
  title: string;
  photo_url: string | null;
  notes: string | null;
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
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  useEffect(() => {
    loadEntry();
  }, [date]);

  async function loadEntry() {
    setLoading(true);
    const { data } = await supabase
      .from("nuestra_entries")
      .select("id, date, title, photo_url, notes")
      .eq("date", date)
      .maybeSingle();

    setEntry(data);
    setLoading(false);
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

      // Limitar tamaño: si el base64 pesa más de 500KB, cortar a 800px
      const sizeKb = (base64.length * 3) / 4 / 1024;
      let uploadBytes: Uint8Array;

      if (sizeKb > 500) {
        // Redimensionar usando manipulateAsync con el base64
        const resized = await manipulateAsync(
          `data:image/png;base64,${base64}`,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: SaveFormat.PNG }
        );
        // Subir con FormData desde el archivo resized
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
        uploadBytes = base64ToBytes(base64);

        const { error: uploadError } = await supabase.storage
          .from("nuestra-photos")
          .upload(filePath, uploadBytes, { contentType: "image/png", upsert: true });

        if (uploadError) {
          Alert.alert("Error al subir", uploadError.message);
          return;
        }
      }

      const { data: urlData } = supabase.storage
        .from("nuestra-photos")
        .getPublicUrl(filePath);

      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      setUploadStatus("Guardando...");
      if (entry) {
        const { error } = await supabase
          .from("nuestra_entries")
          .update({ photo_url: photoUrl })
          .eq("id", entry.id);
        if (error) {
          Alert.alert("Error", error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("nuestra_entries").insert({
          date,
          title: formatDisplayDate(date),
          photo_url: photoUrl,
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
        // Upload directo con bytes (para resultados de remove-bg / clipboard)
        uploadBody = base64ToBytes(base64Data);
        uploadOptions = { contentType: "image/png", upsert: true };
      } else {
        // Upload con FormData (para archivos locales)
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

      const { data: urlData } = supabase.storage
        .from("nuestra-photos")
        .getPublicUrl(filePath);

      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      setUploadStatus("Guardando...");
      if (entry) {
        const { error } = await supabase
          .from("nuestra_entries")
          .update({ photo_url: photoUrl })
          .eq("id", entry.id);
        if (error) {
          Alert.alert("Error", error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("nuestra_entries").insert({
          date,
          title: formatDisplayDate(date),
          photo_url: photoUrl,
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

  async function pickFromGallery() {
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

    // Limpiar prefijo data URI si existe
    const raw = clipboardImage.data;
    const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
    uploadBase64(base64);
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
      <Text style={styles.date}>{formatDisplayDate(date)}</Text>

      {entry?.photo_url ? (
        <View style={styles.photoContainer}>
          <View style={styles.photoWrapper}>
            <Image
              source={{ uri: entry.photo_url }}
              style={styles.photo}
              contentFit="contain"
              transition={300}
            />
          </View>
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={styles.statusText}>{uploadStatus}</Text>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={pickFromGallery}>
                <Text style={styles.actionButtonText}>Galería</Text>
              </TouchableOpacity>
              {Platform.OS === "ios" && (
                <TouchableOpacity style={styles.actionButton} onPress={pasteFromClipboard}>
                  <Text style={styles.actionButtonText}>Pegar</Text>
                </TouchableOpacity>
              )}
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
                style={styles.uploadArea}
                onPress={pickFromGallery}
                activeOpacity={0.7}
              >
                <Text style={styles.uploadIcon}>+</Text>
                <Text style={styles.uploadText}>Elegir de galería</Text>
              </TouchableOpacity>

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={styles.pasteButton}
                  onPress={pasteFromClipboard}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pasteButtonText}>Pegar foto sin fondo</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  date: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.lg,
    textTransform: "capitalize",
  },
  photoContainer: {
    flex: 1,
    alignItems: "center",
  },
  photoWrapper: {
    flex: 1,
    width: "100%",
    maxHeight: 500,
  },
  photo: {
    width: "100%",
    height: "100%",
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
    color: colors.accent,
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
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  uploadArea: {
    height: 250,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  uploadingCol: {
    alignItems: "center",
    gap: spacing.md,
  },
  uploadStatusText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  uploadIcon: {
    fontSize: 48,
    color: colors.accent,
    fontWeight: "300",
    marginBottom: spacing.sm,
  },
  uploadText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  pasteButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
  },
  pasteButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
});
