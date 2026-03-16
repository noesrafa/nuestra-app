import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useLetter } from "@/hooks/use-letter";
import { formatDisplayDate } from "@/lib/utils";

export default function LetterScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { colors, isDark } = useTheme();
  const { sentLetter, sendLetter } = useLetter(date);
  const [body, setBody] = useState(sentLetter?.body ?? "");
  const [sending, setSending] = useState(false);

  const paperBg = isDark ? "#2A1520" : "#FFF8F0";
  const lineColor = isDark ? "rgba(212,99,138,0.15)" : "rgba(139,34,82,0.08)";

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);

    const ok = await sendLetter(trimmed);
    setSending(false);

    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else {
      Alert.alert("Error", "No se pudo enviar la cartita. Intenta de nuevo.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Escribir cartita</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.dateLabel, { color: colors.accent }]}>
          {formatDisplayDate(date)}
        </Text>

        <View style={[styles.paper, { backgroundColor: paperBg }]}>
          {/* Decorative lines */}
          {Array.from({ length: 12 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.line,
                { top: 48 + i * 32, backgroundColor: lineColor },
              ]}
            />
          ))}

          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="Escribe algo bonito..."
            placeholderTextColor={colors.textSecondary}
            multiline
            autoFocus
            value={body}
            onChangeText={setBody}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.accent, opacity: body.trim() && !sending ? 1 : 0.5 },
          ]}
          onPress={handleSend}
          disabled={!body.trim() || sending}
          activeOpacity={0.8}
        >
          <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
          <Text style={styles.sendText}>
            {sending ? "Enviando..." : "Enviar cartita"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingTop: Platform.OS === "ios" ? 60 : spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "capitalize",
    letterSpacing: 0.3,
    marginBottom: spacing.md,
  },
  paper: {
    borderRadius: 12,
    padding: spacing.lg,
    minHeight: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  line: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    height: 1,
  },
  textInput: {
    fontSize: 17,
    lineHeight: 32,
    fontStyle: "italic",
    paddingTop: spacing.lg,
    minHeight: 350,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === "ios" ? 34 : spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: 25,
  },
  sendText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
