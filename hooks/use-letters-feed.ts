import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { useCouple } from "@/hooks/use-couple";
import { useRealtime } from "@/hooks/use-realtime";
import { useFocusEffect } from "expo-router";
import type { Letter } from "@/lib/types";

export type FeedLetter = Letter & {
  isMine: boolean;
};

export function useLettersFeed() {
  const { user } = useAuth();
  const { coupleId } = useCouple();
  const [letters, setLetters] = useState<FeedLetter[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!coupleId || !user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from(DB.TABLES.LETTERS)
      .select(DB.SELECTS.LETTER_FULL)
      .eq("couple_id", coupleId)
      .order("date", { ascending: false });

    const feed = (data ?? []).map((l: Letter) => ({
      ...l,
      isMine: l.from_user === user.id,
    }));

    setLetters(feed);
    setLoading(false);
  }, [coupleId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useRealtime(DB.TABLES.LETTERS, load);

  return { letters, loading, reload: load };
}
