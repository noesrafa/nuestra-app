import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeOption } from "@/contexts/theme-context";

const THEME_OPTIONS: { key: ThemeOption; label: string; icon: string }[] = [
  { key: "auto", label: "Auto", icon: "phone-portrait-outline" },
  { key: "rosa", label: "Claro", icon: "sunny-outline" },
  { key: "dark", label: "Oscuro", icon: "moon-outline" },
];

export function ThemeSection() {
  const { theme, setTheme, colors } = useTheme();

  function selectTheme(value: ThemeOption) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(value);
  }

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.accent }]}>Apariencia</Text>
      <View style={[styles.card, { backgroundColor: colors.background }]}>
        <View style={[styles.themeRow, { backgroundColor: colors.background }]}>
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.themeButton,
                  active && [styles.themeButtonActive, { backgroundColor: colors.surface, borderColor: colors.border }],
                ]}
                onPress={() => selectTheme(opt.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={opt.icon as keyof typeof Ionicons.glyphMap} size={15} color={colors.accent} style={{ opacity: active ? 1 : 0.5 }} />
                <Text style={[styles.themeButtonText, { color: colors.accent, opacity: active ? 1 : 0.5 }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  themeRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
  },
  themeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
  },
  themeButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  themeButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
