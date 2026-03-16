import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";
import { useRealtime } from "@/hooks/use-realtime";
import type { Couple, MemberProfile } from "@/lib/types";

export function useCouple() {
  const [couple, setCouple] = useState<Couple | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
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

    setUserId(user.id);

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

  useRealtime(DB.TABLES.COUPLES, fetch);

  // Am I user_a or user_b?
  const isUserA = couple ? couple.user_a === userId : false;

  // Nickname I gave my partner (what I call them)
  const partnerNickname = couple
    ? isUserA ? couple.nickname_a : couple.nickname_b
    : null;

  // Nickname my partner gave me (what they call me)
  const myNickname = couple
    ? isUserA ? couple.nickname_b : couple.nickname_a
    : null;

  async function setPartnerNickname(nickname: string) {
    if (!couple) return;
    const field = isUserA ? "nickname_a" : "nickname_b";
    await supabase
      .from(DB.TABLES.COUPLES)
      .update({ [field]: nickname || null })
      .eq("id", couple.id);
    await fetch();
  }

  return {
    couple,
    coupleId: couple?.id ?? null,
    inviteCode: couple?.invite_code ?? null,
    isComplete: couple ? couple.user_b !== null : false,
    avatars,
    partnerNickname,
    myNickname,
    setPartnerNickname,
    loading,
    refetch: fetch,
  };
}
