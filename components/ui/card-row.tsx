import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  text: string;
  textColor?: string;
  subtext?: string;
  loading?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

export function CardRow({ icon, iconColor, text, textColor, subtext, loading, onPress, disabled }: Props) {
  const { colors } = useTheme();

  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={iconColor ?? colors.accent} />
      <View style={subtext ? { flex: 1 } : undefined}>
        <Text style={[styles.text, { color: textColor ?? colors.accent }]}>{text}</Text>
        {subtext && <Text style={[styles.subtext, { color: colors.accent, opacity: 0.6 }]}>{subtext}</Text>}
      </View>
      {loading && <ActivityIndicator color={iconColor ?? colors.accent} size="small" style={styles.trailing} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  text: {
    fontSize: 15,
    fontWeight: "500",
  },
  subtext: {
    fontSize: 13,
    marginTop: 1,
  },
  trailing: {
    marginLeft: "auto",
  },
});
