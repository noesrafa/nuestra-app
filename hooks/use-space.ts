import { useEffect, useState, useCallback } from "react";
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

  useEffect(() => {
    fetch();
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
