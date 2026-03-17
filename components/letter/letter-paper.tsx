import { View, Text, ScrollView, StyleSheet, Dimensions } from "react-native";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  body: string | null;
  signText: string;
};

export function LetterPaper({ body, signText }: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.paper, { backgroundColor: colors.paper }]}
      contentContainerStyle={styles.paperContent}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <View
          key={i}
          style={[styles.line, { top: 24 + i * 30, backgroundColor: colors.lineColor }]}
        />
      ))}

      <Text style={[styles.letterBody, { color: colors.text }]}>
        {body}
      </Text>

      <View style={styles.signRow}>
        <View style={[styles.signLine, { backgroundColor: colors.accent }]} />
        <Text style={[styles.letterSign, { color: colors.accent }]}>
          {signText}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  paper: {
    width: "100%",
    borderRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.55,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  paperContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.lg,
    minHeight: 200,
  },
  line: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    height: StyleSheet.hairlineWidth,
  },
  letterBody: {
    fontSize: 18,
    lineHeight: 30,
    fontStyle: "italic",
  },
  signRow: {
    alignItems: "flex-end",
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  signLine: {
    width: 40,
    height: 1,
    opacity: 0.3,
  },
  letterSign: {
    fontSize: 13,
    fontStyle: "italic",
    fontWeight: "500",
  },
});
