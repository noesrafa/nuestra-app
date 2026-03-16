import { useRef, useState } from "react";
import { Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";
import { APP } from "@/lib/constants";

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const inProgress = useRef(false);

  async function signInWithGoogle() {
    if (inProgress.current) return;
    inProgress.current = true;

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: APP.AUTH_CALLBACK,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error || !data.url) {
        Alert.alert("Error", error?.message ?? "No se pudo iniciar con Google");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        APP.AUTH_CALLBACK
      );

      if (result.type === "success") {
        const url = result.url;
        const hashOrSearch = url.includes("#")
          ? url.substring(url.indexOf("#") + 1)
          : url.includes("?")
            ? url.substring(url.indexOf("?") + 1)
            : "";

        const params = new URLSearchParams(hashOrSearch);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) Alert.alert("Error", sessionError.message);
        } else {
          const errorMsg = params.get("error_description") || params.get("error");
          if (errorMsg) Alert.alert("Error", decodeURIComponent(errorMsg));
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Error al iniciar con Google");
    } finally {
      setLoading(false);
      inProgress.current = false;
    }
  }

  return { signInWithGoogle, loading };
}
