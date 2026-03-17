import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useGoals } from "@/hooks/use-goals";
import { GoalInput } from "@/components/goals/goal-input";
import { GoalItem } from "@/components/goals/goal-item";
import type { Goal } from "@/lib/types";

export default function GoalsScreen() {
  const { colors } = useTheme();
  const { pending, completed, loading, load, add, toggle, remove, reorder } = useGoals();
  const [showCompleted, setShowCompleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function renderPendingItem({ item, drag, isActive }: RenderItemParams<Goal>) {
    return (
      <GoalItem
        goal={item}
        onToggle={() => toggle(item)}
        onDelete={() => remove(item.id)}
        drag={drag}
        isActive={isActive}
      />
    );
  }

  const completedSection = completed.length > 0 && (
    <View style={styles.completedSection}>
      <TouchableOpacity
        onPress={() => setShowCompleted(!showCompleted)}
        style={styles.completedToggle}
      >
        <Ionicons
          name={showCompleted ? "chevron-down" : "chevron-forward"}
          size={16}
          color={colors.textSecondary}
        />
        <Text style={[styles.completedLabel, { color: colors.textSecondary }]}>
          Completados ({completed.length})
        </Text>
      </TouchableOpacity>
      {showCompleted &&
        completed.map((goal) => (
          <GoalItem
            key={goal.id}
            goal={goal}
            onToggle={() => toggle(goal)}
            onDelete={() => remove(goal.id)}
          />
        ))}
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.accent }]}>Metas</Text>

        <View style={styles.content}>
          <GoalInput onAdd={add} />

          <DraggableFlatList
            data={pending}
            keyExtractor={(item) => item.id}
            renderItem={renderPendingItem}
            onDragEnd={({ data }) => reorder(data)}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.empty}>
                  <Ionicons name="flag-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Agreguen metas juntos
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={completedSection || undefined}
            containerStyle={styles.list}
          />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "300",
    textAlign: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  list: {
    flex: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  completedSection: {
    marginTop: 16,
    paddingBottom: 40,
  },
  completedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  completedLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
