import { Stack } from "expo-router";
import { useTheme } from "@/hooks/use-theme";

export default function CalendarLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.accent,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="day/[date]" options={{ headerTitle: "" }} />
      <Stack.Screen name="gift/[date]" options={{ headerTitle: "" }} />
      <Stack.Screen name="letter/[date]" options={{ headerTitle: "" }} />
      <Stack.Screen name="song/[date]" options={{ headerTitle: "" }} />
    </Stack>
  );
}
