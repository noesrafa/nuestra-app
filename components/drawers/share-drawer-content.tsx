import { Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/use-theme";

export function ShareDrawerContent() {
  const { colors } = useTheme();

  return (
    <>
      <Ionicons name="share-outline" size={40} color={colors.accent} />
      <Text style={[styles.title, { color: colors.text }]}>Compartir</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Próximamente...</Text>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
});
