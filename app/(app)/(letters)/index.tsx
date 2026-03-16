import { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useLettersFeed, type FeedLetter } from "@/hooks/use-letters-feed";
import { formatDisplayDate } from "@/lib/utils";

type Filter = "received" | "sent";

function Toggle({ active, colors }: { active: Filter; colors: Record<string, string> }) {
  return null; // rendered inline
}

function LetterCard({
  letter,
  colors,
  isDark,
  onPress,
}: {
  letter: FeedLetter;
  colors: Record<string, string>;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: isDark ? colors.accentLight : "#FFFFFF" }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardDate, { color: colors.textSecondary }]} numberOfLines={1}>
          {formatDisplayDate(letter.date)}
        </Text>
        {!letter.isMine && !letter.read_at && (
          <View style={[styles.newBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.newBadgeText}>Nueva</Text>
          </View>
        )}
      </View>

      <Text style={[styles.cardBody, { color: colors.text }]} numberOfLines={3}>
        {letter.body}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={[styles.cardSign, { color: colors.accent }]}>
          {letter.isMine ? "tu cartita" : "con amor"}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

export default function LettersFeedScreen() {
  const { colors, isDark } = useTheme();
  const { letters, loading, reload } = useLettersFeed();
  const [filter, setFilter] = useState<Filter>("received");

  const received = useMemo(() => letters.filter((l) => !l.isMine), [letters]);
  const sent = useMemo(() => letters.filter((l) => l.isMine), [letters]);
  const unreadCount = useMemo(() => received.filter((l) => !l.read_at).length, [received]);
  const readReceived = useMemo(() => received.filter((l) => !!l.read_at), [received]);
  const filtered = filter === "received" ? readReceived : sent;

  function handleLetterPress(letter: FeedLetter) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.navigate({
      pathname: "/(app)/(calendar)",
      params: { openDate: letter.date },
    } as any);
  }

  function switchFilter(f: Filter) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(f);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.accent }]}>Cartitas</Text>

      {/* Toggle */}
      <View style={[styles.toggleRow, { backgroundColor: isDark ? colors.accentLight : colors.background }]}>
        <TouchableOpacity
          style={[styles.toggleBtn, filter === "received" && [styles.toggleActive, { backgroundColor: colors.accent }]]}
          onPress={() => switchFilter("received")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="heart"
            size={14}
            color={filter === "received" ? "#FFFFFF" : colors.accent}
          />
          <Text style={[styles.toggleText, { color: filter === "received" ? "#FFFFFF" : colors.accent }]}>
            Recibidas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, filter === "sent" && [styles.toggleActive, { backgroundColor: colors.accent }]]}
          onPress={() => switchFilter("sent")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="paper-plane"
            size={14}
            color={filter === "sent" ? "#FFFFFF" : colors.accent}
          />
          <Text style={[styles.toggleText, { color: filter === "sent" ? "#FFFFFF" : colors.accent }]}>
            Enviadas
          </Text>
        </TouchableOpacity>
      </View>

      {filter === "received" && unreadCount > 0 && (
        <View style={[styles.unreadBanner, { borderColor: colors.accent }]}>
          <Ionicons name="gift" size={18} color={colors.accent} />
          <Text style={[styles.unreadText, { color: colors.accent }]}>
            {unreadCount === 1
              ? "Tienes 1 cartita por descubrir"
              : `Tienes ${unreadCount} cartitas por descubrir`}
          </Text>
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name={filter === "received" ? "heart-outline" : "paper-plane-outline"}
            size={48}
            color={colors.accent}
            style={{ opacity: 0.3 }}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {filter === "received"
              ? unreadCount > 0 ? "Abre tus regalos en el calendario" : "No has recibido cartitas aún"
              : "No has enviado cartitas aún"}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
            {filter === "received"
              ? unreadCount > 0 ? "Las cartitas aparecen aquí después de leerlas" : "Tu pareja puede escribirte desde el calendario"
              : "Escríbele algo bonito desde el calendario"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LetterCard
              letter={item}
              colors={colors}
              isDark={isDark}
              onPress={() => handleLetterPress(item)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={reload} tintColor={colors.accent} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  unreadText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
    flex: 1,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  cardBody: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  cardSign: {
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "500",
  },
});
