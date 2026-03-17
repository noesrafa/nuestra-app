import { Stack } from "expo-router";
import { useTheme } from "@/hooks/use-theme";

export default function CalendarLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="day/[date]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Volver",
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="letter/[date]"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="gift/[date]"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="song/[date]"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
    </Stack>
  );
}
