import { createContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";
import { useRealtime } from "@/hooks/use-realtime";
import { useAuth } from "@/hooks/use-auth";
import type { Couple, MemberProfile } from "@/lib/types";

type CoupleContextType = {
  couple: Couple | null;
  coupleId: string | null;
  userId: string | null;
  inviteCode: string | null;
  isComplete: boolean;
  avatars: [string | null, string | null];
  partnerNickname: string | null;
  myNickname: string | null;
  setPartnerNickname: (nickname: string) => Promise<void>;
  loading: boolean;
  refetch: () => Promise<void>;
};

export const CoupleContext = createContext<CoupleContextType | null>(null);

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [couple, setCouple] = useState<Couple | null>(null);
  const [avatars, setAvatars] = useState<[string | null, string | null]>([null, null]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) {
      setCouple(null);
      setAvatars([null, null]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from(DB.TABLES.COUPLES)
      .select(DB.SELECTS.COUPLE_FULL)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .maybeSingle();

    setCouple(data);

    if (data) {
      const ids = [data.user_a, data.user_b].filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from(DB.TABLES.PROFILES)
        .select(DB.SELECTS.PROFILE_AVATAR)
        .in("id", ids);
      const profileMap = new Map(
        profiles?.map((p: MemberProfile & { id: string }) => [p.id, p.avatar_url]) ?? []
      );
      const partnerId = data.user_a === userId ? data.user_b : data.user_a;
      setAvatars([
        profileMap.get(userId) ?? null,
        partnerId ? profileMap.get(partnerId) ?? null : null,
      ]);
    } else {
      setAvatars([null, null]);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useRealtime(DB.TABLES.COUPLES, fetch);

  const derived = useMemo(() => {
    const isUserA = couple ? couple.user_a === userId : false;
    return {
      coupleId: couple?.id ?? null,
      inviteCode: couple?.invite_code ?? null,
      isComplete: couple ? couple.user_b !== null : false,
      partnerNickname: couple ? (isUserA ? couple.nickname_a : couple.nickname_b) : null,
      myNickname: couple ? (isUserA ? couple.nickname_b : couple.nickname_a) : null,
      isUserA,
    };
  }, [couple, userId]);

  const setPartnerNickname = useCallback(
    async (nickname: string) => {
      if (!couple) return;
      const field = derived.isUserA ? "nickname_a" : "nickname_b";
      await supabase
        .from(DB.TABLES.COUPLES)
        .update({ [field]: nickname || null })
        .eq("id", couple.id);
      await fetch();
    },
    [couple, derived.isUserA, fetch]
  );

  const value = useMemo(
    () => ({
      couple,
      userId,
      avatars,
      loading,
      refetch: fetch,
      setPartnerNickname,
      ...derived,
    }),
    [couple, userId, avatars, loading, fetch, setPartnerNickname, derived]
  );

  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}
