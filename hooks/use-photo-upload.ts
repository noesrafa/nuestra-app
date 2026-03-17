import { useState } from "react";
import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";
import { DB, STORAGE, IMAGE } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/utils";
import type { Entry } from "@/lib/types";

export type UploadContext = {
  date: string;
  entry: Entry | null;
  coupleId: string | null;
  title: string;
  notes: string;
  onSuccess: () => void;
};

export function usePhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  async function uploadPhoto(imageSource: string, ctx: UploadContext) {
    setUploading(true);
    try {
      setUploadStatus("Optimizando...");
      const resized = await manipulateAsync(
        imageSource,
        [{ resize: { width: IMAGE.RESIZE_WIDTH } }],
        { compress: IMAGE.COMPRESS_QUALITY, format: SaveFormat.WEBP }
      );

      setUploadStatus("Subiendo foto...");
      const fileName = `${ctx.date}.webp`;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const filePath = `${user.id}/${fileName}`;
      const formData = new FormData();
      formData.append("file", {
        uri: resized.uri,
        name: fileName,
        type: "image/webp",
      } as unknown as Blob);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE.BUCKET)
        .upload(filePath, formData, { upsert: true });

      if (uploadError) {
        Alert.alert("Error al subir", uploadError.message);
        return;
      }

      setUploadStatus("Guardando...");
      if (ctx.entry) {
        const { error } = await supabase
          .from(DB.TABLES.ENTRIES)
          .update({ photo_url: filePath })
          .eq("id", ctx.entry.id);
        if (error) { Alert.alert("Error", error.message); return; }
      } else {
        const { error } = await supabase.from(DB.TABLES.ENTRIES).insert({
          couple_id: ctx.coupleId,
          date: ctx.date,
          title: ctx.title || formatDisplayDate(ctx.date),
          photo_url: filePath,
          notes: ctx.notes || null,
          created_by: user.id,
        });
        if (error) { Alert.alert("Error", error.message); return; }
      }

      ctx.onSuccess();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      Alert.alert("Error", message);
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  }

  async function pickFromGallery(ctx: UploadContext) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tus fotos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: IMAGE.COMPRESS_QUALITY,
    });

    if (result.canceled) return;
    uploadPhoto(result.assets[0].uri, ctx);
  }

  async function readClipboardImage(): Promise<string | null> {
    if (Platform.OS !== "ios") return null;
    const hasImage = await Clipboard.hasImageAsync();
    if (!hasImage) return null;
    const clipboardImage = await Clipboard.getImageAsync({ format: "png" });
    if (!clipboardImage?.data) return null;
    const raw = clipboardImage.data;
    return raw.includes(",") ? raw : `data:image/png;base64,${raw}`;
  }

  async function pasteFromClipboard(ctx: UploadContext) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const image = await readClipboardImage();
    if (!image) {
      Alert.alert(
        "Sin imagen",
        "No hay imagen en el portapapeles. Mantené presionada una foto en Fotos y tocá 'Copiar'."
      );
      return;
    }
    uploadPhoto(image, ctx);
  }

  async function smartPick(ctx: UploadContext) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const clipImage = await readClipboardImage();
    if (clipImage) {
      uploadPhoto(clipImage, ctx);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tus fotos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: IMAGE.COMPRESS_QUALITY,
    });
    if (result.canceled) return;
    uploadPhoto(result.assets[0].uri, ctx);
  }

  return { uploading, uploadStatus, uploadPhoto, pickFromGallery, pasteFromClipboard, smartPick };
}
