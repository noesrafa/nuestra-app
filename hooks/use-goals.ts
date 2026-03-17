import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";
import { useRealtime } from "@/hooks/use-realtime";
import { useAuth } from "@/hooks/use-auth";
import { useCouple } from "@/hooks/use-couple";
import type { Goal } from "@/lib/types";

export function useGoals() {
  const { user } = useAuth();
  const { coupleId } = useCouple();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from(DB.TABLES.GOALS)
      .select(DB.SELECTS.GOAL_FULL)
      .order("completed", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    setGoals((data as Goal[]) ?? []);
    setLoading(false);
  }, []);

  useRealtime(DB.TABLES.GOALS, load);

  async function add(title: string, dueDate?: string) {
    if (!user || !coupleId) return;

    // Get max position among pending goals
    const maxPos = goals
      .filter((g) => !g.completed)
      .reduce((max, g) => Math.max(max, g.position), -1);

    await supabase.from(DB.TABLES.GOALS).insert({
      couple_id: coupleId,
      title,
      due_date: dueDate || null,
      created_by: user.id,
      position: maxPos + 1,
    });
  }

  async function toggle(goal: Goal) {
    if (!user) return;

    if (goal.completed) {
      // Un-complete
      await supabase
        .from(DB.TABLES.GOALS)
        .update({ completed: false, completed_by: null, completed_at: null })
        .eq("id", goal.id);
    } else {
      // Complete
      await supabase
        .from(DB.TABLES.GOALS)
        .update({
          completed: true,
          completed_by: user.id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", goal.id);
    }
  }

  async function remove(id: string) {
    await supabase.from(DB.TABLES.GOALS).delete().eq("id", id);
  }

  async function reorder(reordered: Goal[]) {
    // Optimistic update
    setGoals(reordered);

    const updates = reordered
      .filter((g) => !g.completed)
      .map((g, i) => ({ id: g.id, position: i }));

    // Batch update positions
    await Promise.all(
      updates.map(({ id, position }) =>
        supabase.from(DB.TABLES.GOALS).update({ position }).eq("id", id)
      )
    );
  }

  const pending = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);

  return { goals, pending, completed, loading, load, add, toggle, remove, reorder };
}
