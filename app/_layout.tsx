import { useEffect, useRef } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import "react-native-reanimated";

import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/contexts/theme-context";
import { useTheme } from "@/hooks/use-theme";

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (loading) return;

    const isAuthenticated = !!session;
    const inAuthGroup = segments[0] === "(auth)";
    const inAppGroup = segments[0] === "(app)";

    if (isAuthenticated && !inAppGroup) {
      router.replace("/(app)");
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    }

    if (!hasNavigated.current) {
      hasNavigated.current = true;
      SplashScreen.hideAsync();
    }
  }, [session, loading, segments]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="auth-callback" />
          </Stack>
          <ThemedStatusBar />
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
