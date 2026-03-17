import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeOption, LayoutOption } from "@/contexts/theme-context";

const THEME_OPTIONS: { key: ThemeOption; label: string; icon: string }[] = [
  { key: "rosa", label: "Claro", icon: "sunny-outline" },
  { key: "dark", label: "Oscuro", icon: "moon-outline" },
];

const LAYOUT_OPTIONS: { key: LayoutOption; label: string; icon: string }[] = [
  { key: "messy", label: "Desordenado", icon: "shuffle-outline" },
  { key: "tidy", label: "Ordenado", icon: "grid-outline" },
];

export function ThemeSection() {
  const { theme, setTheme, layout, setLayout, colors } = useTheme();

  function selectTheme(value: ThemeOption) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(value);
  }

  function selectLayout(value: LayoutOption) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLayout(value);
  }

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.accent }]}>APARIENCIA</Text>
      <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
        <View style={[styles.themeRow, { backgroundColor: colors.cardBg }]}>
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.themeButton,
                  active && [styles.themeButtonActive, { backgroundColor: colors.background, borderColor: colors.border }],
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
      <View style={{ height: spacing.sm }} />
      <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
        <View style={[styles.themeRow, { backgroundColor: colors.cardBg }]}>
          {LAYOUT_OPTIONS.map((opt) => {
            const active = layout === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.themeButton,
                  active && [styles.themeButtonActive, { backgroundColor: colors.background, borderColor: colors.border }],
                ]}
                onPress={() => selectLayout(opt.key)}
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
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
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
  themeButtonActive: {},
  themeButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
