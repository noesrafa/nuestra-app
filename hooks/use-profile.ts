import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
};

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from(DB.TABLES.PROFILES)
      .select(DB.SELECTS.PROFILE_DISPLAY)
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [userId]);

  return {
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
}
