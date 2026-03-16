import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Space = {
  id: string;
  couple_id: string;
  status: "active" | "paused" | "pending_delete" | "deleted";
  paused_at: string | null;
  paused_by: string | null;
  delete_requested_at: string | null;
  delete_requested_by: string | null;
  created_at: string;
};

export function useSpace() {
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("nuestra_spaces")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setSpace(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();

    const channel = supabase
      .channel("space-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nuestra_spaces",
        },
        () => fetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetch]);

  const status = space?.status ?? null;
  const deleteRequestedAt = space?.delete_requested_at
    ? new Date(space.delete_requested_at)
    : null;

  const canFinalizeDelete =
    status === "pending_delete" && deleteRequestedAt
      ? new Date().getTime() - deleteRequestedAt.getTime() >= 24 * 60 * 60 * 1000
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
