import { useEffect, useId } from "react";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";

export function useRealtimeEntries(onUpdate: () => void) {
  const channelId = useId();

  useEffect(() => {
    const channel = supabase
      .channel(`entries-realtime-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: DB.TABLES.ENTRIES },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
