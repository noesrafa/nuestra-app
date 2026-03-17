import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";

export default function SpotifyCallback() {
  useEffect(() => {
    // This screen catches the Spotify OAuth redirect deep link.
    // WebBrowser.openAuthSessionAsync handles the token exchange,
    // so we just navigate back.
    router.back();
  }, []);

  return <View style={{ flex: 1, backgroundColor: "#000" }} />;
}
