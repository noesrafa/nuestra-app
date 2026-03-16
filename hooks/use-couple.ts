import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";
import type { Couple, MemberProfile } from "@/lib/types";

export function useCouple() {
  const [couple, setCouple] = useState<Couple | null>(null);
  const [avatars, setAvatars] = useState<[string | null, string | null]>([null, null]);
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
      .from(DB.TABLES.COUPLES)
      .select(DB.SELECTS.COUPLE_FULL)
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .maybeSingle();

    setCouple(data);

    if (data) {
      const ids = [data.user_a, data.user_b].filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from(DB.TABLES.PROFILES)
        .select(DB.SELECTS.PROFILE_AVATAR)
        .in("id", ids);
      const profileMap = new Map(profiles?.map((p: MemberProfile & { id: string }) => [p.id, p.avatar_url]) ?? []);
      const partnerId = data.user_a === user.id ? data.user_b : data.user_a;
      setAvatars([profileMap.get(user.id) ?? null, partnerId ? profileMap.get(partnerId) ?? null : null]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    couple,
    coupleId: couple?.id ?? null,
    inviteCode: couple?.invite_code ?? null,
    isComplete: couple ? couple.user_b !== null : false,
    avatars,
    loading,
    refetch: fetch,
  };
}
