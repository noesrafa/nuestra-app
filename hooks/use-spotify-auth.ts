import { useState, useEffect, useCallback, useRef } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";
import { DB, SPOTIFY } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";

type TokenRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

export function useSpotifyAuth() {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkConnection = useCallback(async () => {
    if (!user) {
      setIsConnected(false);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from(DB.TABLES.SPOTIFY_TOKENS)
      .select("id")
      .eq("user_id", user.id)
      .single();

    setIsConnected(!!data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = useCallback(async (): Promise<boolean> => {
    const u = userRef.current;
    if (!u) return false;

    // PKCE flow
    const codeVerifier = Crypto.randomUUID() + Crypto.randomUUID();
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    const codeChallenge = digest
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
    if (!clientId) return false;

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: SPOTIFY.REDIRECT_URI,
      scope: SPOTIFY.SCOPES.join(" "),
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
    });

    const result = await WebBrowser.openAuthSessionAsync(
      `${SPOTIFY.AUTH_URL}?${params}`,
      SPOTIFY.REDIRECT_URI
    );

    if (result.type !== "success") return false;

    // Parse code from callback URL (custom scheme, so use string parsing)
    const url = result.url;
    const queryString = url.includes("?") ? url.substring(url.indexOf("?") + 1) : "";
    const callbackParams = new URLSearchParams(queryString);
    const code = callbackParams.get("code");
    if (!code) {
      console.warn("[SpotifyAuth] No code in callback:", url);
      return false;
    }

    // Exchange code for tokens
    const tokenRes = await fetch(SPOTIFY.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY.REDIRECT_URI,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.warn("[SpotifyAuth] Token exchange failed:", tokenRes.status, err);
      return false;
    }

    const tokens = await tokenRes.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error } = await supabase
      .from(DB.TABLES.SPOTIFY_TOKENS)
      .upsert(
        {
          user_id: u.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
        },
        { onConflict: "user_id" }
      );

    if (!error) {
      setIsConnected(true);
      return true;
    }
    return false;
  }, []);

  const getAccessToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    const u = userRef.current;
    if (!u) return null;

    const { data } = await supabase
      .from(DB.TABLES.SPOTIFY_TOKENS)
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", u.id)
      .single();

    if (!data) return null;
    const row = data as TokenRow;

    // Return if still valid (with 60s buffer) and not forcing refresh
    if (!forceRefresh && new Date(row.expires_at).getTime() > Date.now() + 60_000) {
      return row.access_token;
    }

    // Refresh
    const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
    if (!clientId) return null;

    const res = await fetch(SPOTIFY.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: row.refresh_token,
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("[SpotifyAuth] Refresh failed:", res.status, err);
      if (res.status === 400 || res.status === 401) {
        await supabase
          .from(DB.TABLES.SPOTIFY_TOKENS)
          .delete()
          .eq("user_id", u.id);
        setIsConnected(false);
      }
      return null;
    }

    const tokens = await res.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase
      .from(DB.TABLES.SPOTIFY_TOKENS)
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? row.refresh_token,
        expires_at: expiresAt,
      })
      .eq("user_id", u.id);

    return tokens.access_token;
  }, []);

  const disconnect = useCallback(async () => {
    const u = userRef.current;
    if (!u) return;

    await supabase
      .from(DB.TABLES.SPOTIFY_TOKENS)
      .delete()
      .eq("user_id", u.id);

    setIsConnected(false);
  }, []);

  return { isConnected, loading, connect, getAccessToken, disconnect };
}
