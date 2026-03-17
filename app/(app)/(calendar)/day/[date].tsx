import { Platform, ScrollView, KeyboardAvoidingView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { DayDetailContent } from "@/components/day-detail-content";

export default function DayScreen() {
  const { date, readOnly, autoReveal } = useLocalSearchParams<{
    date: string;
    readOnly?: string;
    autoReveal?: string;
  }>();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={["bottom"]}>
      <Stack.Screen options={{
        title: "",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.accent,
        headerBackTitle: "Volver",
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="chevron-back" size={22} color={colors.accent} />
            <Text style={[styles.headerBackText, { color: colors.accent }]}>Volver</Text>
          </TouchableOpacity>
        ),
      }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <DayDetailContent
            date={date}
            onChanged={() => {}}
            readOnly={readOnly === "1"}
            autoReveal={autoReveal as "sent" | "received" | undefined}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingRight: 12,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
});
