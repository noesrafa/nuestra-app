import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/constants/theme";

type Props = {
  status: "paused" | "pending_delete";
  deleteRequestedAt: Date | null;
};

function formatCountdown(ms: number) {
  if (ms <= 0) return "Listo";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function SpaceStatusBanner({ status, deleteRequestedAt }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== "pending_delete" || !deleteRequestedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [status, deleteRequestedAt]);

  if (status === "paused") {
    return (
      <View style={[styles.banner, styles.bannerPaused]}>
        <Ionicons name="pause-circle" size={16} color="#92400E" />
        <Text style={styles.textPaused}>Espacio en pausa</Text>
      </View>
    );
  }

  const remaining = deleteRequestedAt
    ? deleteRequestedAt.getTime() + 24 * 60 * 60 * 1000 - now
    : 0;

  return (
    <View style={[styles.banner, styles.bannerDelete]}>
      <Ionicons name="warning" size={16} color="#991B1B" />
      <Text style={styles.textDelete}>
        Eliminación pendiente — {remaining > 0 ? formatCountdown(remaining) : "Listo para eliminar"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  bannerPaused: {
    backgroundColor: "#FEF3C7",
  },
  bannerDelete: {
    backgroundColor: "#FEE2E2",
  },
  textPaused: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "600",
  },
  textDelete: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "600",
  },
});
