import { DB } from "@/lib/constants";
import { useRealtime } from "@/hooks/use-realtime";

export function useRealtimeEntries(onUpdate: () => void) {
  useRealtime(DB.TABLES.ENTRIES, onUpdate);
}
