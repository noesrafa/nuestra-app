import { useEffect, useRef, useId } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";
import type { RealtimeChannel } from "@supabase/supabase-js";

type TableName = (typeof DB.TABLES)[keyof typeof DB.TABLES];

/**
 * Subscribe to realtime changes on a Supabase table.
 * Each call creates its own channel with a unique name.
 * Automatically reconnects when app returns to foreground.
 */
export function useRealtime(table: TableName, callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const channelId = useId();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    function createChannel() {
      // Clean up previous
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const ch = supabase
        .channel(`rt-${table}-${channelId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => callbackRef.current()
        )
        .subscribe();

      channelRef.current = ch;
    }

    createChannel();

    // Reconnect + refetch when app comes back to foreground
    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        createChannel();
        callbackRef.current();
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      appSub.remove();
    };
  }, [table, channelId]);
}
