import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/use-theme";
import type { Goal } from "@/lib/types";

type Props = {
  goal: Goal;
  onToggle: () => void;
  onDelete: () => void;
  drag?: () => void;
  isActive?: boolean;
};

export function GoalItem({ goal, onToggle, onDelete, drag, isActive }: Props) {
  const { colors } = useTheme();

  const dueDateText = goal.due_date
    ? new Date(goal.due_date + "T12:00:00").toLocaleDateString("es", {
        day: "numeric",
        month: "short",
      })
    : null;

  const isOverdue =
    goal.due_date && !goal.completed && goal.due_date < new Date().toISOString().slice(0, 10);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.cardBg, opacity: isActive ? 0.9 : 1 },
        isActive && { shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
      ]}
    >
      {!goal.completed && drag && (
        <TouchableOpacity onLongPress={drag} delayLongPress={100} style={styles.dragHandle}>
          <Ionicons name="menu" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
        <Ionicons
          name={goal.completed ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={goal.completed ? colors.accent : colors.textSecondary}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: colors.text },
            goal.completed && { textDecorationLine: "line-through", opacity: 0.5 },
          ]}
          numberOfLines={2}
        >
          {goal.title}
        </Text>
        {dueDateText && (
          <Text style={[styles.dueDate, { color: isOverdue ? "#EF4444" : colors.textSecondary }]}>
            {dueDateText}
          </Text>
        )}
      </View>

      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  dragHandle: {
    paddingRight: 8,
  },
  checkbox: {
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
  },
  dueDate: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },
});
