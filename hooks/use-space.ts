import { useEffect, useState, useCallback, useId } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import { DB, APP } from "@/lib/constants";
import type { Space } from "@/lib/types";

export function useSpace() {
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from(DB.TABLES.SPACES)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setSpace(data);
    setLoading(false);
  }, []);

  const channelId = useId();

  useEffect(() => {
    fetch();

    // Listen for space changes
    const spaceChannel = supabase
      .channel(`space-realtime-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: DB.TABLES.SPACES },
        () => fetch()
      )
      .subscribe();

    // Also listen for couple changes — when a couple is unlinked/deleted,
    // RLS blocks the space realtime subscription, so we refetch here
    const coupleChannel = supabase
      .channel(`space-couple-sync-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: DB.TABLES.COUPLES },
        () => fetch()
      )
      .subscribe();

    // Refetch on foreground (catches changes hidden by RLS)
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") fetch();
    });

    return () => {
      supabase.removeChannel(spaceChannel);
      supabase.removeChannel(coupleChannel);
      subscription.remove();
    };
  }, [fetch]);

  const status = space?.status ?? null;
  const deleteRequestedAt = space?.delete_requested_at
    ? new Date(space.delete_requested_at)
    : null;

  const canFinalizeDelete =
    status === "pending_delete" && deleteRequestedAt
      ? new Date().getTime() - deleteRequestedAt.getTime() >= APP.DELETION_WINDOW_MS
      : false;

  return {
    space,
    isActive: status === "active",
    isPaused: status === "paused",
    isPendingDelete: status === "pending_delete",
    pausedBy: space?.paused_by ?? null,
    deleteRequestedBy: space?.delete_requested_by ?? null,
    deleteRequestedAt,
    canFinalizeDelete,
    loading,
    refetch: fetch,
  };
}
