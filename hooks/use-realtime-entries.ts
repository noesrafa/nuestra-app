import { useEffect, useId, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";

export function useRealtimeEntries(onUpdate: () => void) {
  const channelId = useId();
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const channel = supabase
      .channel(`entries-realtime-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: DB.TABLES.ENTRIES },
        () => onUpdateRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
