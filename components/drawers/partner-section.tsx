import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useCouple } from "@/hooks/use-couple";

export function PartnerSection() {
  const { colors, isDark } = useTheme();
  const { partnerNickname, setPartnerNickname } = useCouple();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(partnerNickname ?? "");

  function startEditing() {
    setDraft(partnerNickname ?? "");
    setEditing(true);
  }

  async function save() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaving(true);
    await setPartnerNickname(draft.trim());
    setSaving(false);
    setEditing(false);
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.accent }]}>MI PERSONA FAVORITA</Text>

      <TouchableOpacity
        style={[styles.row, { backgroundColor: isDark ? colors.accentLight : "#FFFFFF" }]}
        onPress={editing ? undefined : startEditing}
        activeOpacity={editing ? 1 : 0.7}
      >
        <Ionicons name="heart" size={20} color={colors.accent} />
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>¿Cómo le dices?</Text>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.input, { color: colors.text, borderBottomColor: colors.accent }]}
                value={draft}
                onChangeText={setDraft}
                placeholder="Ej: Amorcito"
                placeholderTextColor={colors.textSecondary}
                autoFocus
                onSubmitEditing={save}
                returnKeyType="done"
              />
              {saving ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.nicknameRow}>
              <Text style={[styles.nickname, { color: colors.text }]}>
                {partnerNickname || "Ponle un apodo"}
              </Text>
              <Ionicons name="pencil" size={14} color={colors.accent} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  nicknameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  nickname: {
    fontSize: 16,
    fontWeight: "600",
    fontStyle: "italic",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    fontStyle: "italic",
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  saveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
