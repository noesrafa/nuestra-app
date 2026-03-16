import { useState, useRef, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { DB, APP } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/utils";
import { resolvePhotoUrl } from "@/lib/storage";
import type { Entry } from "@/lib/types";

export function useEntryManager(date: string, onChanged?: () => void) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(formatDisplayDate(date));
  const [notes, setNotes] = useState("");
  const [hearts, setHearts] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isFirstLoad = useRef(true);

  const loadEntry = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true);
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
    isFirstLoad.current = false;
  }, [date]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  // Realtime: reload entry when it changes in DB
  useEffect(() => {
    const channel = supabase
      .channel(`entry-${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: DB.TABLES.ENTRIES },
        (payload) => {
          const row = (payload.new as Record<string, unknown>) ?? (payload.old as Record<string, unknown>);
          if (row?.date === date) loadEntry();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, loadEntry]);

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
    const newHearts = hearts + 1;
    setHearts(newHearts);
    if (entry) {
      await supabase
        .from(DB.TABLES.ENTRIES)
        .update({ hearts: newHearts })
        .eq("id", entry.id);
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
    loadEntry,
    onTitleChange,
    onNotesChange,
    onHeartTap,
    deleteEntry,
  };
}
