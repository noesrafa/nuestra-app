import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
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

      <Text style={[styles.dateLabel, { color: colors.accent }]}>
        {formatDisplayDate(date)}
      </Text>

      <View style={styles.cardsRow}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.cardBg }]}
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

        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.cardBg }]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  dateLabel: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "capitalize",
    letterSpacing: 0.3,
    marginTop: spacing.md,
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
