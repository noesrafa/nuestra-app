import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { useCouple } from "@/hooks/use-couple";
import { useRealtime } from "@/hooks/use-realtime";
import type { Letter, SpotifyTrack } from "@/lib/types";

export function useLetter(date: string) {
  const { user } = useAuth();
  const { coupleId } = useCouple();
  const [receivedLetter, setReceivedLetter] = useState<Letter | null>(null);
  const [sentLetter, setSentLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLetters = useCallback(async () => {
    if (!coupleId || !user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from(DB.TABLES.LETTERS)
      .select(DB.SELECTS.LETTER_FULL)
      .eq("couple_id", coupleId)
      .eq("date", date);

    const mine = data?.find((l: Letter) => l.from_user === user.id) ?? null;
    const theirs = data?.find((l: Letter) => l.from_user !== user.id) ?? null;

    setSentLetter(mine);
    setReceivedLetter(theirs);
    setLoading(false);
  }, [date, coupleId, user]);

  useEffect(() => {
    loadLetters();
  }, [loadLetters]);

  useRealtime(DB.TABLES.LETTERS, loadLetters);

  async function sendLetter(body: string) {
    if (!coupleId || !user) return false;

    const { error } = await supabase
      .from(DB.TABLES.LETTERS)
      .upsert(
        {
          couple_id: coupleId,
          date,
          from_user: user.id,
          type: "letter",
          body,
          spotify_track_id: null,
          spotify_track_name: null,
          spotify_artist_name: null,
          spotify_artwork_url: null,
          spotify_preview_url: null,
          spotify_external_url: null,
        },
        { onConflict: "couple_id,date,from_user" }
      );

    if (!error) {
      await loadLetters();
      return true;
    }
    return false;
  }

  async function sendSong(track: SpotifyTrack, dedication?: string) {
    if (!coupleId || !user) return false;

    const { error } = await supabase
      .from(DB.TABLES.LETTERS)
      .upsert(
        {
          couple_id: coupleId,
          date,
          from_user: user.id,
          type: "song",
          body: dedication?.trim() || null,
          spotify_track_id: track.id,
          spotify_track_name: track.name,
          spotify_artist_name: track.artist,
          spotify_artwork_url: track.artworkUrl,
          spotify_preview_url: track.previewUrl,
          spotify_external_url: track.externalUrl,
        },
        { onConflict: "couple_id,date,from_user" }
      );

    if (!error) {
      await loadLetters();
      return true;
    }
    return false;
  }

  async function markAsRead() {
    if (!receivedLetter || receivedLetter.read_at) return;

    await supabase
      .from(DB.TABLES.LETTERS)
      .update({ read_at: new Date().toISOString() })
      .eq("id", receivedLetter.id);

    setReceivedLetter({ ...receivedLetter, read_at: new Date().toISOString() });
  }

  return {
    receivedLetter,
    sentLetter,
    loading,
    sendLetter,
    sendSong,
    markAsRead,
    reload: loadLetters,
  };
}
