import { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable, Text, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  onAdd: (title: string, dueDate?: string) => void;
};

export function GoalInput({ onAdd }: Props) {
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd(trimmed, dueDate ? formatDate(dueDate) : undefined);
    setTitle("");
    setDueDate(null);
  }

  function formatDate(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  function handleDateChange(_: any, selected?: Date) {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selected) setDueDate(selected);
  }

  const dueDateLabel = dueDate
    ? dueDate.toLocaleDateString("es", { day: "numeric", month: "short" })
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg }]}>
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder="Agregar meta..."
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />

      <TouchableOpacity
        onPress={() => {
          if (dueDate) {
            setDueDate(null);
          } else {
            setShowDatePicker(true);
          }
        }}
        style={[styles.dateBtn, dueDate && { backgroundColor: colors.accentLight }]}
      >
        {dueDateLabel ? (
          <Text style={[styles.dateBtnText, { color: colors.accent }]}>{dueDateLabel}</Text>
        ) : (
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSubmit}
        style={[styles.addBtn, { backgroundColor: colors.accent }]}
        disabled={!title.trim()}
      >
        <Ionicons name="add" size={22} color={colors.textOnAccent} />
      </TouchableOpacity>

      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(e, d) => {
            setShowDatePicker(false);
            if (d) setDueDate(d);
          }}
        />
      )}

      {showDatePicker && Platform.OS === "ios" && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
            <View />
          </Pressable>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={{ fontSize: 16, color: colors.accent, fontWeight: "700" }}>Listo</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={dueDate || new Date()}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              onChange={handleDateChange}
              locale="es"
              textColor={colors.text}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
  },
  dateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dateBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
