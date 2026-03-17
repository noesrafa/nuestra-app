import { useState, useRef, useCallback } from "react";
import { SPOTIFY } from "@/lib/constants";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import type { SpotifyTrack } from "@/lib/types";

export function useSpotifySearch() {
  const { getAccessToken } = useSpotifyAuth();
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (query: string) => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);

      if (!query.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);

      debounceRef.current = setTimeout(async () => {
        try {
          const token = await getAccessToken();
          if (!token) {
            console.warn("[SpotifySearch] No access token available");
            setSearching(false);
            return;
          }

          const params = new URLSearchParams({
            q: query,
            type: "track",
            limit: String(SPOTIFY.SEARCH_LIMIT),
          });

          let res = await fetch(`${SPOTIFY.API_BASE}/search?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          // If 401, token expired — force refresh and retry once
          if (res.status === 401) {
            const freshToken = await getAccessToken(true);
            if (!freshToken) {
              setSearching(false);
              return;
            }
            res = await fetch(`${SPOTIFY.API_BASE}/search?${params}`, {
              headers: { Authorization: `Bearer ${freshToken}` },
            });
          }

          if (!res.ok) {
            const errBody = await res.text();
            console.warn("[SpotifySearch] Search failed:", res.status, errBody);
            setSearching(false);
            return;
          }

          const data = await res.json();
          const tracks: SpotifyTrack[] = (data.tracks?.items ?? []).map(
            (t: any) => ({
              id: t.id,
              name: t.name,
              artist: t.artists.map((a: any) => a.name).join(", "),
              artworkUrl: t.album?.images?.[0]?.url ?? "",
              previewUrl: t.preview_url,
              externalUrl: t.external_urls?.spotify ?? "",
            })
          );

          setResults(tracks);
        } catch (err) {
          console.warn("[SpotifySearch] Error:", err);
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [getAccessToken]
  );

  function clear() {
    setResults([]);
    setSearching(false);
  }

  return { results, searching, search, clear };
}
