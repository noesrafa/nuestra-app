import { useEffect, useState, useCallback } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";

type Couple = {
  id: string;
  user_a: string;
  user_b: string | null;
  invite_code: string;
};

export function useCouple() {
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("nuestra_couples")
      .select("id, user_a, user_b, invite_code")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .maybeSingle();

    setCouple(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();

    // Realtime for couple changes (works when user CAN see the change)
    const channel = supabase
      .channel("couple-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nuestra_couples",
        },
        () => fetch()
      )
      .subscribe();

    // Poll when app comes back to foreground (catches unlink where RLS hides the event)
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") fetch();
    });

    return () => {
      supabase.removeChannel(channel);
      subscription.remove();
    };
  }, [fetch]);

  return {
    couple,
    coupleId: couple?.id ?? null,
    inviteCode: couple?.invite_code ?? null,
    isComplete: couple ? couple.user_b !== null : false,
    loading,
    refetch: fetch,
  };
}
