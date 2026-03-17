import { View, Text, Switch, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function ThemeSection() {
  const { theme, setTheme, layout, setLayout, colors, isDark } = useTheme();

  function toggleDark(value: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(value ? "dark" : "rosa");
  }

  function toggleLayout(value: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLayout(value ? "messy" : "tidy");
  }

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.accent }]}>APARIENCIA</Text>
      <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.accent }]}>Tema oscuro</Text>
          <Switch
            value={isDark}
            onValueChange={toggleDark}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.accent }]}>Desordenado</Text>
          <Switch
            value={layout === "messy"}
            onValueChange={toggleLayout}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});
