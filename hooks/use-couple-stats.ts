import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";
import { useCouple } from "@/hooks/use-couple";

export type CoupleStats = {
  totalPhotos: number;
  totalLetters: number;
  totalHearts: number;
  sinceDate: string | null;
};

export function useCoupleStats() {
  const { coupleId } = useCouple();
  const [stats, setStats] = useState<CoupleStats>({
    totalPhotos: 0,
    totalLetters: 0,
    totalHearts: 0,
    sinceDate: null,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    const [photos, letters, hearts, couple] = await Promise.all([
      supabase
        .from(DB.TABLES.ENTRIES)
        .select("*", { count: "exact", head: true })
        .not("photo_url", "is", null),
      supabase
        .from(DB.TABLES.LETTERS)
        .select("*", { count: "exact", head: true })
        .eq("couple_id", coupleId),
      supabase
        .from(DB.TABLES.ENTRIES)
        .select("hearts"),
      supabase
        .from(DB.TABLES.COUPLES)
        .select("created_at")
        .eq("id", coupleId)
        .single(),
    ]);

    const totalHearts = (hearts.data ?? []).reduce(
      (sum: number, e: { hearts: number }) => sum + (e.hearts ?? 0),
      0
    );

    setStats({
      totalPhotos: photos.count ?? 0,
      totalLetters: letters.count ?? 0,
      totalHearts,
      sinceDate: couple.data?.created_at ?? null,
    });
    setLoading(false);
  }, [coupleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { stats, loading, reload: load };
}
