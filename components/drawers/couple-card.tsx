import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/constants/theme";
import { APP } from "@/lib/constants";
import { useTheme } from "@/hooks/use-theme";
import { GradientButton } from "@/components/ui/gradient-button";

type Props = {
  isComplete: boolean;
  avatarUrl: string | null;
  inviteCode: string | null;
  avatarsSlot: React.ReactNode;
  statusSlot: React.ReactNode;
  onJoined: () => void;
};

export function CoupleCard({ isComplete, avatarUrl, inviteCode, avatarsSlot, statusSlot, onJoined }: Props) {
  const { colors } = useTheme();
  const [coupleMode, setCoupleMode] = useState<"home" | "join">("home");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  async function joinCouple() {
    if (joinCode.length !== APP.INVITE_CODE_LENGTH) {
      Alert.alert("Casi...", "El código debe tener 8 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("join_couple", { code: joinCode.toLowerCase() });
    setLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onJoined();
  }

  async function copyCode() {
    if (!inviteCode || codeCopied) return;
    await Clipboard.setStringAsync(inviteCode.toUpperCase());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  if (isComplete) {
    return (
      <View style={[styles.card, { backgroundColor: colors.background }]}>
        {avatarsSlot}
        {statusSlot}
      </View>
    );
  }

  return (
    <View key={coupleMode} style={[styles.card, { backgroundColor: colors.background }]}>
      {coupleMode === "join" ? (
        <>
          <Ionicons name="link" size={32} color={colors.accent} />
          <Text style={[styles.title, { color: colors.accent }]}>Vincúlense</Text>
          <Text style={[styles.subtitle, { color: colors.accent, opacity: 0.6 }]}>Ingresa el código que te pasó tu pareja</Text>
          <TextInput
            style={[styles.input, { color: colors.accent, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="--------"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={APP.INVITE_CODE_LENGTH}
          />
          <GradientButton
            label="¡Conectarnos!"
            icon={<Ionicons name="heart" size={18} color={colors.textOnAccent} />}
            onPress={joinCouple}
            loading={loading}
          />
          <TouchableOpacity onPress={() => setCoupleMode("home")} activeOpacity={0.7} style={[styles.outlineBtn, { borderColor: colors.accent }]}>
            <Text style={[styles.outlineBtnText, { color: colors.accent }]}>Volver</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarSolo} contentFit="cover" />
          ) : (
            <View style={[styles.avatarSoloPlaceholder, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="person" size={36} color={colors.accent} />
            </View>
          )}
          <Text style={[styles.title, { color: colors.accent }]}>Tu código de pareja</Text>
          <Text style={[styles.subtitle, { color: colors.accent, opacity: 0.6 }]}>Compártelo para conectar sus calendarios</Text>
          {inviteCode ? (
            <TouchableOpacity onPress={copyCode} activeOpacity={0.7} style={[styles.codeBox, { borderColor: colors.border }]}>
              <Text style={[styles.code, { color: colors.accent }]}>
                {codeCopied ? "¡COPIADO!" : inviteCode.toUpperCase()}
              </Text>
              <Ionicons name={codeCopied ? "checkmark-circle" : "copy-outline"} size={20} color={colors.accent} />
            </TouchableOpacity>
          ) : (
            <ActivityIndicator color={colors.accent} style={{ paddingVertical: 20 }} />
          )}
          {codeCopied && <Text style={[styles.hint, { color: colors.accent, opacity: 0.6 }]}>Mándaselo a tu amor</Text>}
          <GradientButton
            label="Ya tengo un código"
            icon={<Ionicons name="heart" size={18} color={colors.textOnAccent} />}
            onPress={() => setCoupleMode("join")}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 14,
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 3,
    fontWeight: "600",
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginVertical: 8,
  },
  code: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
  },
  hint: {
    fontSize: 12,
  },
  avatarSolo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.sm,
  },
  avatarSoloPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtn: {
    width: "100%",
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
