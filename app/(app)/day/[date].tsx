import { Platform, ScrollView, KeyboardAvoidingView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { DayDetailContent } from "@/components/day-detail-content";

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { colors } = useTheme();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DayDetailContent date={date} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
});
