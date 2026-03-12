import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useRealtimeEntries(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("entries-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nuestra_entries",
        },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
