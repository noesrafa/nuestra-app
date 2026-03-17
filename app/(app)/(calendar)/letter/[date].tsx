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
import { useLocalSearchParams, router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useLetter } from "@/hooks/use-letter";
import { formatDisplayDate } from "@/lib/utils";

export default function LetterScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { colors } = useTheme();
  const { sentLetter, sendLetter } = useLetter(date);
  const [body, setBody] = useState(sentLetter?.body ?? "");
  const [sending, setSending] = useState(false);

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
      Alert.alert("Ups", "No se pudo enviar tu cartita. Intenta de nuevo.");
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={["bottom"]}>
      <Stack.Screen options={{
        title: "",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.accent,
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
          <Text style={[styles.dateLabel, { color: colors.accent }]}>
            {formatDisplayDate(date)}
          </Text>

          <View style={[styles.paper, { backgroundColor: colors.paper }]}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.line,
                  { top: 48 + i * 32, backgroundColor: colors.lineColor },
                ]}
              />
            ))}

            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Dile lo que sientes..."
              placeholderTextColor={colors.accent + "40"}
              multiline
              autoFocus
              value={body}
              onChangeText={setBody}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.accent, opacity: body.trim() && !sending ? 1 : 0.5 },
            ]}
            onPress={handleSend}
            disabled={!body.trim() || sending}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane" size={18} color={colors.textOnAccent} />
            <Text style={[styles.sendText, { color: colors.textOnAccent }]}>
              {sending ? "Enviando..." : "Enviar con amor"}
            </Text>
          </TouchableOpacity>
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
    paddingBottom: 120,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "capitalize",
    letterSpacing: 0.3,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  paper: {
    borderRadius: 12,
    padding: spacing.lg,
    minHeight: 400,
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
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: 25,
    marginTop: spacing.lg,
    alignSelf: "center",
  },
  sendText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
