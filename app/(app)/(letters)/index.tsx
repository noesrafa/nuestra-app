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
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useCouple } from "@/hooks/use-couple";
import { useLettersFeed, type FeedLetter } from "@/hooks/use-letters-feed";
import { formatDisplayDate } from "@/lib/utils";

type Filter = "received" | "sent" | "playlist";

const ROTATIONS = ["-3deg", "2.5deg", "-1.5deg", "3deg", "-2deg", "1.8deg"];

function LetterCard({
  letter,
  index,
  colors,
  signText,
  tidy,
  onPress,
}: {
  letter: FeedLetter;
  index: number;
  colors: Record<string, string>;
  signText: string;
  tidy: boolean;
  onPress: () => void;
}) {
  const paperBg = colors.cardBg;
  const lineColor = colors.lineColor;
  const rotation = tidy ? "0deg" : ROTATIONS[index % ROTATIONS.length];

  const isSong = letter.type === "song";

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: paperBg, transform: [{ rotate: rotation }] }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Paper lines */}
      {!isSong && Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={[styles.line, { top: 12 + i * 26, backgroundColor: lineColor }]} />
      ))}

      {isSong ? (
        <View style={styles.songRow}>
          {letter.spotify_artwork_url && (
            <Image
              source={{ uri: letter.spotify_artwork_url }}
              style={styles.songThumb}
              contentFit="cover"
              transition={200}
            />
          )}
          <View style={styles.songInfo}>
            <View style={styles.songTitleRow}>
              <Ionicons name="musical-notes" size={14} color={colors.accent} style={{ opacity: 0.6 }} />
              <Text style={[styles.songTrackName, { color: colors.text }]} numberOfLines={1}>
                {letter.spotify_track_name}
              </Text>
            </View>
            <Text style={[styles.songArtistName, { color: colors.textSecondary }]} numberOfLines={1}>
              {letter.spotify_artist_name}
            </Text>
            {letter.body ? (
              <Text style={[styles.songDedication, { color: colors.text }]} numberOfLines={2}>
                {`\u201C${letter.body}\u201D`}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={[styles.cardBody, { color: colors.text }]} numberOfLines={3}>
          {letter.body}
        </Text>
      )}

      <View style={styles.cardBottom}>
        <Text style={[styles.cardSign, { color: colors.accent }]}>
          {letter.isMine ? (isSong ? "tu canción" : "tu cartita") : signText}
        </Text>
        <Text style={[styles.cardDate, { color: colors.accent, opacity: 0.5 }]} numberOfLines={1}>
          {formatDisplayDate(letter.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function LettersFeedScreen() {
  const { colors, layout } = useTheme();
  const { partnerNickname } = useCouple();
  const { letters, loading, reload } = useLettersFeed();
  const [filter, setFilter] = useState<Filter>("received");
  const receivedSign = partnerNickname || "con amor";

  const received = useMemo(() => letters.filter((l) => !l.isMine), [letters]);
  const sent = useMemo(() => letters.filter((l) => l.isMine), [letters]);
  const songs = useMemo(() => letters.filter((l) => l.type === "song"), [letters]);
  const unreadCount = useMemo(() => received.filter((l) => !l.read_at).length, [received]);
  const readReceived = useMemo(() => received.filter((l) => !!l.read_at), [received]);
  const filtered = filter === "received" ? readReceived : filter === "sent" ? sent : songs;

  function handleLetterPress(letter: FeedLetter) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.navigate({
      pathname: "/(app)/(calendar)",
      params: { openDate: letter.date, autoReveal: letter.isMine ? "sent" : "received" },
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
      <Text style={[styles.title, { color: colors.accent }]}>Listas</Text>

      {/* Toggle — pill style like Apariencia */}
      <View style={[styles.toggleCard, { backgroundColor: colors.cardBg }]}>
        {(["received", "sent", "playlist"] as const).map((f) => {
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.toggleBtn,
                active && [styles.toggleBtnActive, { backgroundColor: colors.background, borderColor: colors.border }],
              ]}
              onPress={() => switchFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, { color: colors.accent, opacity: active ? 1 : 0.5 }]}>
                {f === "received" ? "Recibidas" : f === "sent" ? "Enviadas" : "Playlist"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filter === "received" && unreadCount > 0 && (
        <View style={styles.unreadRow}>
          <Ionicons name="gift-outline" size={15} color={colors.accent} />
          <Text style={[styles.unreadText, { color: colors.accent }]}>
            {unreadCount === 1
              ? "Tienes 1 regalito por encontrar"
              : `Tienes ${unreadCount} regalitos por encontrar`}
          </Text>
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name={filter === "received" ? "heart-outline" : filter === "sent" ? "paper-plane-outline" : "musical-notes-outline"}
            size={48}
            color={colors.accent}
            style={{ opacity: 0.2 }}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {filter === "received"
              ? unreadCount > 0 ? "Tienes regalos en el calendario" : "Aún no te han enviado nada"
              : filter === "sent" ? "Aún no has enviado nada"
              : "Aún no hay canciones"}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
            {filter === "received"
              ? unreadCount > 0 ? "Ábrelos desde el día que brilla" : "Cuando te envíen algo, lo verás aquí"
              : filter === "sent" ? "Dale una sorpresa desde el calendario"
              : "Las canciones que se dediquen aparecerán aquí"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <LetterCard
              letter={item}
              index={index}
              colors={colors}
              signText={receivedSign}
              tidy={layout === "tidy"}
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
    fontSize: 28,
    fontWeight: "300",
    textAlign: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  toggleCard: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
  },
  toggleBtnActive: {},
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  unreadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: spacing.md,
  },
  unreadText: {
    fontSize: 13,
    fontWeight: "500",
    fontStyle: "italic",
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
    paddingTop: spacing.xs,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 4,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
    minHeight: 100,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  line: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    height: StyleSheet.hairlineWidth,
  },
  cardBody: {
    fontSize: 17,
    lineHeight: 26,
    fontStyle: "italic",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  cardSign: {
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "500",
  },
  cardDate: {
    fontSize: 11,
    textTransform: "capitalize",
  },
  songRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  songThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
    gap: 2,
  },
  songTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  songTrackName: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  songArtistName: {
    fontSize: 13,
  },
  songDedication: {
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 20,
  },
});
