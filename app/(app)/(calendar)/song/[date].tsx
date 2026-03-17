import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSpotifySearch } from "@/hooks/use-spotify-search";
import { useLetter } from "@/hooks/use-letter";
import { formatDisplayDate } from "@/lib/utils";
import type { SpotifyTrack } from "@/lib/types";

type Step = "search" | "dedicate";

export default function SongScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { colors } = useTheme();
  const { results, searching, search, clear } = useSpotifySearch();
  const { sendSong } = useLetter(date);

  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [dedication, setDedication] = useState("");
  const [sending, setSending] = useState(false);

  function handleSearch(text: string) {
    setQuery(text);
    search(text);
  }

  function handleSelectTrack(track: SpotifyTrack) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTrack(track);
    setStep("dedicate");
    clear();
  }

  function handleBackToSearch() {
    setStep("search");
    setSelectedTrack(null);
  }

  async function handleSend() {
    if (!selectedTrack) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);

    const ok = await sendSong(selectedTrack, dedication);
    setSending(false);

    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else {
      Alert.alert("Ups", "No se pudo enviar la canción. Intenta de nuevo.");
    }
  }

  function renderTrackItem({ item }: { item: SpotifyTrack }) {
    return (
      <TouchableOpacity
        style={[styles.trackRow, { borderBottomColor: colors.border }]}
        onPress={() => handleSelectTrack(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.artworkUrl }}
          style={styles.trackThumb}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.trackInfo}>
          <Text style={[styles.trackName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  if (step === "dedicate" && selectedTrack) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={["bottom"]}>
        <Stack.Screen options={{
          title: "",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.accent,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackToSearch} style={styles.headerBack}>
              <Ionicons name="chevron-back" size={22} color={colors.accent} />
              <Text style={[styles.headerBackText, { color: colors.accent }]}>Buscar</Text>
            </TouchableOpacity>
          ),
        }} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >

        <ScrollView
          contentContainerStyle={styles.dedicateContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.artworkContainer}>
            <Image
              source={{ uri: selectedTrack.artworkUrl }}
              style={styles.artworkLarge}
              contentFit="cover"
              transition={300}
            />
          </View>

          <Text style={[styles.selectedTrackName, { color: colors.text }]}>
            {selectedTrack.name}
          </Text>
          <Text style={[styles.selectedArtist, { color: colors.textSecondary }]}>
            {selectedTrack.artist}
          </Text>

          <View style={[styles.dedicationBox, { backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.dedicationInput, { color: colors.accent }]}
              placeholder="Dedícale unas palabras... (opcional)"
              placeholderTextColor={colors.accent + "40"}
              multiline
              value={dedication}
              onChangeText={(t) => setDedication(t.slice(0, 280))}
              maxLength={280}
            />
            <Text style={[styles.charCount, { color: colors.accent + "60" }]}>
              {dedication.length}/280
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.accent, opacity: sending ? 0.5 : 1 },
            ]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.8}
          >
            <Ionicons name="musical-notes" size={18} color={colors.textOnAccent} />
            <Text style={[styles.sendText, { color: colors.textOnAccent }]}>
              {sending ? "Enviando..." : "Enviar con amor"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
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

      <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
        <Ionicons name="search" size={18} color={colors.accent} style={{ opacity: 0.5 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.accent }]}
          placeholder="Nombre de canción o artista..."
          placeholderTextColor={colors.accent + "80"}
          value={query}
          onChangeText={handleSearch}
          autoFocus
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color={colors.accent} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderTrackItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.trim() && !searching ? (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={48} color={colors.accent} style={{ opacity: 0.2 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No se encontraron canciones
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  trackThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackName: {
    fontSize: 15,
    fontWeight: "600",
  },
  trackArtist: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
  },
  dedicateContent: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  artworkContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: spacing.lg,
  },
  artworkLarge: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  selectedTrackName: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  selectedArtist: {
    fontSize: 15,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  dedicationBox: {
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 100,
  },
  dedicationInput: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
    minHeight: 70,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: 25,
    marginTop: spacing.lg,
  },
  sendText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
