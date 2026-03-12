import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { supabase } from "@/lib/supabase";
import { colors, spacing, moods } from "@/constants/theme";
import { useRealtimeEntries } from "@/hooks/use-realtime-entries";
import { useCouple } from "@/hooks/use-couple";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = spacing.md;
const COL_GAP = 2;
const DAY_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - COL_GAP * 6) / 7;
const PHOTO_HEIGHT = DAY_WIDTH * 1.5;
const ROW_HEIGHT = PHOTO_HEIGHT + 48;
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const masksContext = require.context("../../assets/masks", false, /\.png$/);
const MASKS = masksContext.keys().map((key: string) => masksContext(key));

type EntryThumb = { date: string; photo_url: string | null; mood: string | null };

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // Sunday = 0
}

function formatMonth(year: number, month: number) {
  const date = new Date(year, month);
  const name = date.toLocaleDateString("en", { month: "short" });
  return `${name} ${year}`;
}

function formatDate(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<Map<string, { photo_url: string | null; mood: string | null }>>(new Map());
  const [totalDays, setTotalDays] = useState(0);
  const { couple, inviteCode: existingCode, isComplete, refetch: refetchCouple } = useCouple();
  const coupleSheetRef = useRef<BottomSheet>(null);
  const coupleSnapPoints = useMemo(() => ["75%"], []);
  const [coupleMode, setCoupleMode] = useState<"home" | "join">("home");
  const [joinCode, setJoinCode] = useState("");
  const [myCode, setMyCode] = useState<string | null>(null);
  const [coupleLoading, setCoupleLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (existingCode) setMyCode(existingCode);
  }, [existingCode]);

  async function ensureCoupleCode() {
    if (myCode) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("nuestra_couples")
      .insert({ user_a: user.id })
      .select("invite_code")
      .single();
    if (data) {
      setMyCode(data.invite_code);
      refetchCouple();
    }
  }

  function openCoupleSheet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    ensureCoupleCode();
    setCoupleMode("home");
    setJoinCode("");
    coupleSheetRef.current?.expand();
  }

  async function joinCouple() {
    if (joinCode.length !== 8) {
      Alert.alert("Hmm...", "El codigo debe tener 8 caracteres");
      return;
    }
    setCoupleLoading(true);
    const { error } = await supabase.rpc("join_couple", { code: joinCode.toLowerCase() });
    setCoupleLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    refetchCouple();
    coupleSheetRef.current?.close();
  }

  async function copyCode() {
    if (!myCode || codeCopied) return;
    await Clipboard.setStringAsync(myCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCodeCopied(true);
    Animated.sequence([
      Animated.timing(copyFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(copyFade, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setCodeCopied(false));
  }

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      loadTotalDays();
    }, [year, month])
  );

  async function loadEntries() {
    const startDate = formatDate(year, month, 1);
    const endDate = formatDate(year, month, getDaysInMonth(year, month));

    const { data } = await supabase
      .from("nuestra_entries")
      .select("date, photo_url, mood")
      .gte("date", startDate)
      .lte("date", endDate);

    const map = new Map<string, { photo_url: string | null; mood: string | null }>();
    data?.forEach((e: EntryThumb) => map.set(e.date, { photo_url: e.photo_url, mood: e.mood }));
    setEntries(map);
  }

  async function loadTotalDays() {
    const { count } = await supabase
      .from("nuestra_entries")
      .select("*", { count: "exact", head: true })
      .not("photo_url", "is", null);

    setTotalDays(count ?? 0);
  }

  function prevMonth() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = formatDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const cells: (number | null)[] = [];
  // 4 celdas fantasma para que la primera fila empiece por el medio
  for (let i = 0; i < 4; i++) cells.push(null);
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Build rows of 7
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  // Pad last row
  const lastRow = rows[rows.length - 1];
  while (lastRow.length < 7) lastRow.push(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [220], []);
  const [refreshing, setRefreshing] = useState(false);

  function openLogoutSheet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bottomSheetRef.current?.expand();
  }

  async function confirmLogout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    bottomSheetRef.current?.close();
    await supabase.auth.signOut();
  }

  useRealtimeEntries(() => {
    loadEntries();
    loadTotalDays();
  });

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadEntries(), loadTotalDays()]);
    setRefreshing(false);
  }

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />
    ),
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openLogoutSheet} style={styles.logoutButton}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.counterRow}>
          <Ionicons name="heart" size={16} color={colors.text} />
          <Text style={styles.counterText}>{totalDays}</Text>
        </View>
        <TouchableOpacity
          onPress={openCoupleSheet}
          style={styles.coupleButton}
        >
          <Ionicons
            name={isComplete ? "people" : "people-outline"}
            size={22}
            color={isComplete ? colors.accent : colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
            <Text style={styles.navText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{formatMonth(year, month)}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <Text style={styles.navText}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekHeader}>
          {DAYS.map((d, i) => (
            <Text key={i} style={styles.weekDay}>
              {d}
            </Text>
          ))}
        </View>

        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((day, colIndex) => {
              if (day === null) {
                return <View key={`empty-${rowIndex}-${colIndex}`} style={styles.dayCell} />;
              }

              const dateStr = formatDate(year, month, day);
              const isToday = dateStr === todayStr;
              const entryData = entries.get(dateStr);
              const photoUrl = entryData?.photo_url;
              const entryMood = entryData?.mood;
              const moodEmoji = entryMood && moods[entryMood as keyof typeof moods]?.emoji;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={styles.dayCell}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/(app)/day/${dateStr}`);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                    {day}
                  </Text>

                  <Image
                    source={photoUrl ? { uri: photoUrl } : MASKS[((day * 31 + month * 97 + year * 53) * 2654435761 >>> 0) % MASKS.length]}
                    style={styles.photo}
                    contentFit="contain"
                    transition={photoUrl ? 200 : 0}
                  />
                  <Text style={styles.plusIcon}>{moodEmoji ?? "+"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Cerrar sesión</Text>
          <Text style={styles.sheetMessage}>¿Seguro que quieres salir?</Text>
          <TouchableOpacity style={styles.sheetButtonDanger} onPress={confirmLogout}>
            <Text style={styles.sheetButtonDangerText}>Cerrar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetButtonCancel}
            onPress={() => bottomSheetRef.current?.close()}
          >
            <Text style={styles.sheetButtonCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Couple drawer */}
      <BottomSheet
        ref={coupleSheetRef}
        index={-1}
        snapPoints={coupleSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.coupleSheetBg}
        handleIndicatorStyle={styles.coupleSheetHandle}
      >
        <BottomSheetView style={styles.coupleSheetContent}>
          {isComplete ? (
            <>
              <Image
                source={require("../../assets/branding/avatar.png")}
                style={styles.coupleAvatar}
                contentFit="contain"
              />
              <Text style={styles.coupleTitle}>Vinculados</Text>
              <Text style={styles.coupleSubtitle}>Ya estan conectados como pareja</Text>
            </>
          ) : coupleMode === "join" ? (
            <>
              <Ionicons name="link" size={32} color="#E8A0BF" />
              <Text style={styles.coupleTitle}>Unirse</Text>
              <Text style={styles.coupleSubtitle}>Ingresa el codigo que te compartieron</Text>
              <TextInput
                style={styles.coupleInput}
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder="8 caracteres"
                placeholderTextColor="#B08A9A"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={8}
              />
              <TouchableOpacity style={styles.couplePrimaryBtn} onPress={joinCouple} disabled={coupleLoading}>
                {coupleLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.couplePrimaryText}>Vincular</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.coupleSecondaryBtn} onPress={() => setCoupleMode("home")}>
                <Text style={styles.coupleSecondaryText}>Volver</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Image
                source={require("../../assets/branding/avatar.png")}
                style={styles.coupleAvatar}
                contentFit="contain"
              />
              <Text style={styles.coupleTitle}>Tu codigo de pareja</Text>
              <Text style={styles.coupleSubtitle}>Comparti este codigo para vincular calendarios</Text>
              {myCode ? (
                <TouchableOpacity onPress={copyCode} activeOpacity={0.7} style={styles.coupleCodeBox}>
                  {codeCopied ? (
                    <Animated.View style={{ opacity: copyFade, flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={22} color="#6BC06B" />
                      <Text style={[styles.coupleCode, { color: "#6BC06B", fontSize: 20 }]}>Copiado!</Text>
                    </Animated.View>
                  ) : (
                    <>
                      <Text style={styles.coupleCode}>{myCode.toUpperCase()}</Text>
                      <Ionicons name="copy-outline" size={18} color="#B08A9A" />
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <ActivityIndicator color="#E8A0BF" style={{ paddingVertical: 20 }} />
              )}
              <Text style={styles.coupleHint}>{codeCopied ? "Enviaselo a tu pareja" : "Toca para copiar"}</Text>
              <TouchableOpacity style={styles.couplePrimaryBtn} onPress={() => setCoupleMode("join")}>
                <Text style={styles.couplePrimaryText}>Tengo un codigo</Text>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GRID_PADDING,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  logoutButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  coupleButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  counterText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: "300",
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  weekHeader: {
    flexDirection: "row",
    paddingHorizontal: GRID_PADDING,
    marginBottom: spacing.md,
  },
  weekDay: {
    width: DAY_WIDTH,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginRight: COL_GAP,
  },
  scroll: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: GRID_PADDING,
    height: ROW_HEIGHT,
    marginBottom: 4,
  },
  dayCell: {
    width: DAY_WIDTH,
    marginRight: COL_GAP,
    alignItems: "center",
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dayNumberToday: {
    color: colors.accent,
    fontWeight: "700",
  },
  photo: {
    width: DAY_WIDTH - 8,
    height: PHOTO_HEIGHT,
    borderRadius: 4,
  },
  plusIcon: {
    fontSize: 16,
    color: "#B0B0B0",
    fontWeight: "400",
    marginTop: 2,
    lineHeight: 18,
  },
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
  },
  sheetHandle: {
    backgroundColor: "#D0D0D0",
    width: 40,
  },
  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  sheetMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  sheetButtonDanger: {
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  sheetButtonDangerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  sheetButtonCancel: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  sheetButtonCancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },
  coupleSheetBg: {
    backgroundColor: "#FFF0F5",
    borderRadius: 24,
  },
  coupleSheetHandle: {
    backgroundColor: "#E8A0BF",
    width: 40,
  },
  coupleSheetContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: "center",
    gap: 10,
    paddingTop: spacing.md,
  },
  coupleAvatar: {
    width: 80,
    height: 80,
    marginBottom: spacing.sm,
  },
  coupleTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4A3040",
    textAlign: "center",
  },
  coupleSubtitle: {
    fontSize: 14,
    color: "#B08A9A",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  coupleCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF8FA",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F5D5E5",
    borderStyle: "dashed",
  },
  coupleCode: {
    fontSize: 28,
    fontWeight: "800",
    color: "#E8A0BF",
    letterSpacing: 4,
  },
  coupleHint: {
    fontSize: 12,
    color: "#B08A9A",
    marginTop: -2,
  },
  coupleInput: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#F5D5E5",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    fontSize: 20,
    textAlign: "center",
    color: "#4A3040",
    letterSpacing: 3,
    backgroundColor: "#FFF8FA",
    fontWeight: "600",
  },
  couplePrimaryBtn: {
    width: "100%",
    backgroundColor: "#E8A0BF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  couplePrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  coupleSecondaryBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FFF8FA",
  },
  coupleSecondaryText: {
    color: "#B08A9A",
    fontSize: 15,
    fontWeight: "600",
  },
});
