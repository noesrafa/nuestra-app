import { useState, useRef, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { DB, APP } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/utils";
import { resolvePhotoUrl } from "@/lib/storage";
import type { Entry } from "@/lib/types";

export function useEntryManager(date: string, onChanged?: () => void, refreshKey?: number) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(formatDisplayDate(date));
  const [notes, setNotes] = useState("");
  const [hearts, setHearts] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const photoScale = useSharedValue(1);

  const animatedPhotoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
  }));

  const loadEntry = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from(DB.TABLES.ENTRIES)
      .select(DB.SELECTS.ENTRY_FULL)
      .eq("date", date)
      .maybeSingle();

    if (data) {
      data.photo_url = await resolvePhotoUrl(data.photo_url);
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
  }, [date, refreshKey]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  function debounceSave(updates: Record<string, unknown>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (entry) {
        await supabase
          .from(DB.TABLES.ENTRIES)
          .update(updates)
          .eq("id", entry.id);
        onChanged?.();
      }
    }, APP.DEBOUNCE_SAVE_MS);
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
    photoScale.value = withSequence(
      withSpring(1.05, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 6, stiffness: 200 })
    );
    const newHearts = hearts + 1;
    setHearts(newHearts);
    if (entry) {
      await supabase
        .from(DB.TABLES.ENTRIES)
        .update({ hearts: newHearts })
        .eq("id", entry.id);
      onChanged?.();
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
          await supabase.from(DB.TABLES.ENTRIES).delete().eq("id", entry.id);
          setEntry(null);
          setTitle(formatDisplayDate(date));
          setNotes("");
          setHearts(0);
          onChanged?.();
        },
      },
    ]);
  }

  return {
    entry,
    loading,
    title,
    notes,
    hearts,
    animatedPhotoStyle,
    loadEntry,
    onTitleChange,
    onNotesChange,
    onHeartTap,
    deleteEntry,
  };
}
