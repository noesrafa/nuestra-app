import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { formatDisplayDate } from "@/lib/utils";

export default function GiftSelectorScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { colors } = useTheme();
  const { isConnected, connect } = useSpotifyAuth();

  function handleLetter() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace(`/(app)/(calendar)/letter/${date}`);
  }

  async function handleSong() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isConnected) {
      const connected = await connect();
      if (!connected) {
        Alert.alert(
          "Spotify",
          "Necesitas conectar tu Spotify para dedicar canciones."
        );
        return;
      }
    }

    router.replace(`/(app)/(calendar)/song/${date}`);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Elige tu regalo
        </Text>
        <View style={styles.backButton} />
      </View>

      <Text style={[styles.dateLabel, { color: colors.accent }]}>
        {formatDisplayDate(date)}
      </Text>

      <View style={styles.cardsRow}>
        {/* Cartita */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.paper }]}
          onPress={handleLetter}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="mail" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Cartita</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Escríbele algo lindo
          </Text>
        </TouchableOpacity>

        {/* Canción */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.paper }]}
          onPress={handleSong}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="musical-notes" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Canción</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Dedícale una canción
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
  dateLabel: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "capitalize",
    letterSpacing: 0.3,
    marginBottom: spacing.xl,
  },
  cardsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 13,
    textAlign: "center",
  },
});
