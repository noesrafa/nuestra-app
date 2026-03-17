import { Stack } from "expo-router";
import { useTheme } from "@/hooks/use-theme";

export default function GoalsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
