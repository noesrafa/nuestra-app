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
import { spacing, moods } from "@/constants/theme";
import { useRealtimeEntries } from "@/hooks/use-realtime-entries";
import { useCouple } from "@/hooks/use-couple";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { LinearGradient } from "expo-linear-gradient";
import type { ThemeOption } from "@/contexts/theme-context";

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

const THEME_OPTIONS: { key: ThemeOption; label: string; icon: string }[] = [
  { key: "auto", label: "Auto", icon: "phone-portrait-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
  { key: "rosa", label: "Rosa", icon: "heart-outline" },
];

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { displayName, avatarUrl } = useProfile(user?.id);
  const { theme, setTheme, colors, isDark } = useTheme();
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
  const [coupleLoading, setCoupleLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyFade = useRef(new Animated.Value(0)).current;

  function openCoupleSheet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    if (!existingCode || codeCopied) return;
    await Clipboard.setStringAsync(existingCode);
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
    if (data) {
      // Generate signed URLs for entries with photo paths
      const paths = data.filter((e: EntryThumb) => e.photo_url && !e.photo_url.startsWith("http")).map((e: EntryThumb) => e.photo_url!);
      const signedMap = new Map<string, string>();
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage
          .from("nuestra-photos")
          .createSignedUrls(paths, 3600);
        signed?.forEach((s) => { if (s.signedUrl) signedMap.set(s.path!, s.signedUrl); });
      }
      data.forEach((e: EntryThumb) => {
        const url = e.photo_url && !e.photo_url.startsWith("http")
          ? signedMap.get(e.photo_url) ?? null
          : e.photo_url;
        map.set(e.date, { photo_url: url, mood: e.mood });
      });
    }
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

  const settingsSheetRef = useRef<BottomSheet>(null);
  const settingsSnapPoints = useMemo(() => ["55%"], []);
  const [refreshing, setRefreshing] = useState(false);

  function openSettingsSheet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    settingsSheetRef.current?.expand();
  }

  function selectTheme(value: ThemeOption) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(value);
  }

  async function confirmLogout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    settingsSheetRef.current?.close();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openSettingsSheet} style={styles.settingsButton}>
          <Feather name="more-horizontal" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.counterRow}>
          <Image source={require("../../assets/icons-3d/heart.png")} style={{ width: 20, height: 20 }} contentFit="contain" />
          <Text style={[styles.counterText, { color: colors.text }]}>{totalDays}</Text>
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
            <Text style={[styles.navText, { color: colors.text }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: colors.text }]}>{formatMonth(year, month)}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <Text style={[styles.navText, { color: colors.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekHeader}>
          {DAYS.map((d, i) => (
            <Text key={i} style={[styles.weekDay, { color: colors.textSecondary }]}>
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
                  <Text style={[styles.dayNumber, { color: colors.textSecondary }, isToday && [styles.dayNumberToday, { color: colors.accent }]]}>
                    {day}
                  </Text>

                  <Image
                    source={photoUrl ? { uri: photoUrl } : MASKS[((day * 31 + month * 97 + year * 53) * 2654435761 >>> 0) % MASKS.length]}
                    style={styles.photo}
                    contentFit="contain"
                    transition={photoUrl ? 200 : 0}
                  />
                  <Text style={[styles.plusIcon, { color: colors.textSecondary }]}>{moodEmoji ?? "+"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Settings drawer */}
      <BottomSheet
        ref={settingsSheetRef}
        index={-1}
        snapPoints={settingsSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.sheetBg, { backgroundColor: colors.surface }]}
        handleIndicatorStyle={[styles.sheetHandle, { backgroundColor: colors.border }]}
      >
        <BottomSheetView style={styles.settingsContent}>
          {/* Account card */}
          <View style={[styles.settingsCard, { backgroundColor: colors.background }]}>
            <View style={styles.settingsAccount}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.settingsAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.settingsAvatarPlaceholder, { backgroundColor: colors.accentLight }]}>
                  <Ionicons name="person" size={28} color={colors.accent} />
                </View>
              )}
              <View style={styles.settingsAccountInfo}>
                <Text style={[styles.settingsName, { color: colors.text }]}>{displayName ?? "Sin nombre"}</Text>
                <Text style={[styles.settingsEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </View>

          {/* Theme card */}
          <View style={[styles.settingsCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.settingsLabel, { color: colors.textSecondary }]}>APARIENCIA</Text>
            <View style={[styles.themeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {THEME_OPTIONS.map((opt, i) => {
                const isActive = theme === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.themeButton,
                      isActive && { backgroundColor: colors.accent },
                    ]}
                    onPress={() => selectTheme(opt.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={opt.icon as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={isActive ? "#FFFFFF" : colors.textSecondary}
                    />
                    <Text style={[styles.themeButtonText, { color: isActive ? "#FFFFFF" : colors.textSecondary }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Logout card */}
          <View style={[styles.settingsCard, { backgroundColor: colors.background }]}>
            <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} activeOpacity={0.6}>
              <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>

      {/* Couple drawer */}
      <BottomSheet
        ref={coupleSheetRef}
        index={-1}
        snapPoints={coupleSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.coupleSheetBg, { backgroundColor: isDark ? colors.surface : "#FFF0F5" }]}
        handleIndicatorStyle={[styles.coupleSheetHandle, { backgroundColor: colors.accent }]}
      >
        <BottomSheetView style={styles.coupleSheetContent}>
          {isComplete ? (
            <>
              <Image
                source={require("../../assets/branding/avatar.png")}
                style={styles.coupleAvatar}
                contentFit="contain"
              />
              <Text style={[styles.coupleTitle, { color: colors.text }]}>Vinculados</Text>
              <Text style={[styles.coupleSubtitle, { color: colors.textSecondary }]}>Ya estan conectados como pareja</Text>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Desvincular",
                    "¿Seguro que quieres desvincular tu pareja? Las entries se mantienen pero ya no se sincronizarán.",
                    [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Desvincular",
                        style: "destructive",
                        onPress: async () => {
                          const { error } = await supabase.rpc("unlink_couple");
                          if (error) {
                            Alert.alert("Error", error.message);
                            return;
                          }
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          refetchCouple();
                          coupleSheetRef.current?.close();
                        },
                      },
                    ]
                  );
                }}
                style={[styles.coupleSecondaryBtn, { backgroundColor: colors.surface }]}
              >
                <Text style={{ color: "#FF3B30", fontSize: 15, fontWeight: "600" }}>Desvincular</Text>
              </TouchableOpacity>
            </>
          ) : coupleMode === "join" ? (
            <>
              <Ionicons name="link" size={32} color={colors.accent} />
              <Text style={[styles.coupleTitle, { color: colors.text }]}>Unirse</Text>
              <Text style={[styles.coupleSubtitle, { color: colors.textSecondary }]}>Ingresa el codigo que te compartieron</Text>
              <TextInput
                style={[styles.coupleInput, { color: colors.text, borderColor: colors.accentLight, backgroundColor: colors.surface }]}
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder="8 caracteres"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={8}
              />
              <TouchableOpacity onPress={joinCouple} disabled={coupleLoading} activeOpacity={0.8} style={styles.couplePrimaryBtn}>
                <LinearGradient
                  colors={["#F7A9BB", "#F36581"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.couplePrimaryGradient}
                >
                  {coupleLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.couplePrimaryInner}>
                      <Image source={require("../../assets/icons-3d/heart.png")} style={{ width: 22, height: 22 }} contentFit="contain" />
                      <Text style={styles.couplePrimaryText}>Vincular</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.coupleSecondaryBtn, { backgroundColor: colors.surface }]} onPress={() => setCoupleMode("home")}>
                <Text style={[styles.coupleSecondaryText, { color: colors.textSecondary }]}>Volver</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Image
                source={require("../../assets/branding/avatar.png")}
                style={styles.coupleAvatar}
                contentFit="contain"
              />
              <Text style={[styles.coupleTitle, { color: colors.text }]}>Tu codigo de pareja</Text>
              <Text style={[styles.coupleSubtitle, { color: colors.textSecondary }]}>Comparti este codigo para vincular calendarios</Text>
              {existingCode ? (
                <TouchableOpacity onPress={copyCode} activeOpacity={0.7} style={[styles.coupleCodeBox, { backgroundColor: colors.surface, borderColor: colors.accentLight }]}>
                  {codeCopied ? (
                    <Animated.View style={{ opacity: copyFade, flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={22} color="#6BC06B" />
                      <Text style={[styles.coupleCode, { color: "#6BC06B", fontSize: 20 }]}>Copiado!</Text>
                    </Animated.View>
                  ) : (
                    <>
                      <Text style={[styles.coupleCode, { color: colors.accent }]}>{existingCode.toUpperCase()}</Text>
                      <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <ActivityIndicator color={colors.accent} style={{ paddingVertical: 20 }} />
              )}
              <Text style={[styles.coupleHint, { color: colors.textSecondary }]}>{codeCopied ? "Enviaselo a tu pareja" : "Toca para copiar"}</Text>
              <TouchableOpacity onPress={() => setCoupleMode("join")} activeOpacity={0.8} style={styles.couplePrimaryBtn}>
                <LinearGradient
                  colors={["#F7A9BB", "#F36581"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.couplePrimaryGradient}
                >
                  <View style={styles.couplePrimaryInner}>
                    <Image source={require("../../assets/icons-3d/heart.png")} style={{ width: 22, height: 22 }} contentFit="contain" />
                    <Text style={styles.couplePrimaryText}>Tengo un codigo</Text>
                  </View>
                </LinearGradient>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GRID_PADDING,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  settingsButton: {
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
    fontWeight: "300",
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
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
    marginBottom: 2,
  },
  dayNumberToday: {
    fontWeight: "700",
  },
  photo: {
    width: DAY_WIDTH - 8,
    height: PHOTO_HEIGHT,
    borderRadius: 4,
  },
  plusIcon: {
    fontSize: 16,
    fontWeight: "400",
    marginTop: 2,
    lineHeight: 18,
  },
  sheetBg: {
    borderRadius: 24,
  },
  sheetHandle: {
    width: 40,
  },
  settingsContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: 12,
  },
  settingsCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingsAccount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  settingsAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  settingsAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsAccountInfo: {
    flex: 1,
    gap: 2,
  },
  settingsName: {
    fontSize: 18,
    fontWeight: "600",
  },
  settingsEmail: {
    fontSize: 13,
  },
  settingsLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: -4,
  },
  themeRow: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  themeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  logoutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "500",
  },
  coupleSheetBg: {
    borderRadius: 24,
  },
  coupleSheetHandle: {
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
    textAlign: "center",
  },
  coupleSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  coupleCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  coupleCode: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
  },
  coupleHint: {
    fontSize: 12,
    marginTop: -2,
  },
  coupleInput: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 3,
    fontWeight: "600",
  },
  couplePrimaryBtn: {
    width: "100%",
    marginTop: spacing.sm,
    borderRadius: 28,
    overflow: "hidden",
  },
  couplePrimaryGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  couplePrimaryInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  couplePrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  coupleSecondaryBtn: {
    width: "100%",
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: "center",
  },
  coupleSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
