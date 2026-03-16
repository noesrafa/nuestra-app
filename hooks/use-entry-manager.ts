import { useState, useRef, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { DB, APP } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/utils";
import { resolvePhotoUrl } from "@/lib/storage";
import { useRealtime } from "@/hooks/use-realtime";
import type { Entry } from "@/lib/types";

export function useEntryManager(date: string, onChanged?: () => void) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(formatDisplayDate(date));
  const [notes, setNotes] = useState("");
  const [hearts, setHearts] = useState(0);
  const heartsRef = useRef(0);
  const heartTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heartCooldown = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastDate = useRef(date);
  if (lastDate.current !== date) {
    lastDate.current = date;
    setLoading(true);
  }

  const loadEntry = useCallback(async () => {
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
      const h = data.hearts ?? 0;
      if (!heartCooldown.current) {
        setHearts(h);
        heartsRef.current = h;
      }
    } else {
      setTitle(formatDisplayDate(date));
      setNotes("");
      setHearts(0);
      heartsRef.current = 0;
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  useRealtime(DB.TABLES.ENTRIES, loadEntry);

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

  function onHeartTap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartsRef.current += 1;
    setHearts(heartsRef.current);
    heartCooldown.current = true;

    if (heartTimer.current) clearTimeout(heartTimer.current);
    heartTimer.current = setTimeout(async () => {
      if (entry) {
        await supabase
          .from(DB.TABLES.ENTRIES)
          .update({ hearts: heartsRef.current })
          .eq("id", entry.id);
      }
      heartCooldown.current = false;
    }, 800);
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
    loadEntry,
    onTitleChange,
    onNotesChange,
    onHeartTap,
    deleteEntry,
  };
}
