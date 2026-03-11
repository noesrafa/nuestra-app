import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
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
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
