import { useState, useCallback, useRef } from "react";
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
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/constants/theme";
import { useRealtimeEntries } from "@/hooks/use-realtime-entries";
import { useCouple } from "@/hooks/use-couple";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { LinearGradient } from "expo-linear-gradient";
import { Drawer } from "@/components/drawer";
import { DayDetailContent } from "@/components/day-detail-content";
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

type EntryThumb = { date: string; photo_url: string | null };

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
  { key: "rosa", label: "Rosa", icon: "heart-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
];

export default function CalendarScreen() {
  const { user } = useAuth();
  const { displayName, avatarUrl } = useProfile(user?.id);
  const { theme, setTheme, colors, isDark } = useTheme();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<Map<string, { photo_url: string | null }>>(new Map());
  const [totalDays, setTotalDays] = useState(0);
  const { couple, inviteCode: existingCode, isComplete, avatars, refetch: refetchCouple } = useCouple();

  const shareDrawerRef = useRef<BottomSheet>(null);
  const dayDrawerRef = useRef<BottomSheet>(null);
  const coupleDrawerRef = useRef<BottomSheet>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [coupleMode, setCoupleMode] = useState<"home" | "join">("home");
  const [joinCode, setJoinCode] = useState("");
  const [coupleLoading, setCoupleLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);


  function openShareDrawer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    shareDrawerRef.current?.expand();
  }

  function openCoupleDrawer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCoupleMode("home");
    setJoinCode("");
    coupleDrawerRef.current?.expand();
  }

  function openDayDrawer(date: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(date);
    dayDrawerRef.current?.expand();
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
    coupleDrawerRef.current?.close();
  }

  async function copyCode() {
    if (!existingCode || codeCopied) return;
    await Clipboard.setStringAsync(existingCode.toUpperCase());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
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
      .select("date, photo_url")
      .gte("date", startDate)
      .lte("date", endDate);

    const map = new Map<string, { photo_url: string | null }>();
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
        map.set(e.date, { photo_url: url });
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

  const [refreshing, setRefreshing] = useState(false);

  function selectTheme(value: ThemeOption) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(value);
  }

  async function confirmLogout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    coupleDrawerRef.current?.close();
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openShareDrawer} style={styles.shareButton}>
          <Ionicons name="share" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.counterRow}>
          <Image source={require("../../assets/icons-3d/heart.png")} style={{ width: 20, height: 20 }} contentFit="contain" />
          <Text style={[styles.counterText, { color: colors.text }]}>{totalDays}</Text>
        </View>
        <TouchableOpacity
          onPress={openCoupleDrawer}
          style={styles.coupleButton}
        >
          {isComplete && avatars[0] && avatars[1] ? (
            <View style={styles.avatarStack}>
              <Image
                source={{ uri: avatars[0] }}
                style={[styles.avatarSmall, styles.avatarLeft]}
                contentFit="cover"
              />
              <Image
                source={{ uri: avatars[1] }}
                style={[styles.avatarSmall, styles.avatarRight]}
                contentFit="cover"
              />
              <View style={styles.avatarHeart}>
                <Image source={require("../../assets/icons-3d/heart.png")} style={{ width: 14, height: 14 }} contentFit="contain" />
              </View>
            </View>
          ) : (
            <View style={{ width: 36, height: 36 }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
              ) : (
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentLight, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="person" size={18} color={colors.accent} />
                </View>
              )}
              <Text style={{ fontSize: 14, position: "absolute", top: -2, right: -6 }}>💔</Text>
            </View>
          )}
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

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={styles.dayCell}
                  onPress={() => openDayDrawer(dateStr)}
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
                  <Text style={[styles.plusIcon, { color: colors.textSecondary }]}>+</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Share drawer */}
      <Drawer ref={shareDrawerRef}>
        <Ionicons name="share-outline" size={40} color={colors.accent} />
        <Text style={[styles.shareTitle, { color: colors.text }]}>Compartir</Text>
        <Text style={[styles.shareSubtitle, { color: colors.textSecondary }]}>Próximamente...</Text>
      </Drawer>

      {/* Day detail drawer */}
      <Drawer ref={dayDrawerRef} snapPoints={["85%"]} scrollable>
        {selectedDate ? <DayDetailContent date={selectedDate} onChanged={onRefresh} /> : null}
      </Drawer>

      {/* Couple drawer */}
      <Drawer ref={coupleDrawerRef}>
        {isComplete ? (
          <>
            <View style={styles.avatarStackLarge}>
              <Image
                source={{ uri: avatars[0] ?? undefined }}
                style={[styles.avatarLarge, styles.avatarLargeLeft]}
                contentFit="cover"
              />
              <Image
                source={{ uri: avatars[1] ?? undefined }}
                style={[styles.avatarLarge, styles.avatarLargeRight]}
                contentFit="cover"
              />
              <View style={styles.avatarHeartLarge}>
                <Image source={require("../../assets/icons-3d/heart.png")} style={{ width: 24, height: 24 }} contentFit="contain" />
              </View>
            </View>
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
                      },
                    },
                  ]
                );
              }}
              style={[styles.coupleSecondaryBtn, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.accentLight }]}
            >
              <Text style={{ color: colors.accent, fontSize: 15, fontWeight: "600" }}>Desvincular</Text>
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
              placeholder="--------"
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
                    <Text style={styles.couplePrimaryText}>Vincular</Text>
                    <Ionicons name="heart" size={18} color="#FFFFFF" />
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
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.coupleAvatarSolo}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.coupleAvatarSoloPlaceholder, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="person" size={36} color={colors.accent} />
              </View>
            )}
            <Text style={[styles.coupleTitle, { color: colors.text }]}>Tu codigo de pareja</Text>
            <Text style={[styles.coupleSubtitle, { color: colors.textSecondary }]}>Comparti este codigo para vincular calendarios</Text>
            {existingCode ? (
              <TouchableOpacity onPress={copyCode} activeOpacity={0.7} style={[styles.coupleCodeBox, { backgroundColor: colors.surface, borderColor: colors.accentLight }]}>
                <Text style={[styles.coupleCode, { color: "#D4507A" }]}>
                  {codeCopied ? "COPIADO!" : existingCode.toUpperCase()}
                </Text>
                <Ionicons name={codeCopied ? "checkmark-circle" : "copy-outline"} size={20} color="#D4507A" />
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
                  <Text style={styles.couplePrimaryText}>Tengo un codigo</Text>
                  <Ionicons name="heart" size={18} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

        <View style={styles.settingsSection}>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.settingsAccountInfo}>
              <Text style={[styles.settingsName, { color: colors.text }]}>{displayName ?? "Sin nombre"}</Text>
              <Text style={[styles.settingsEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.settingsLabel, { color: colors.textSecondary }]}>APARIENCIA</Text>
            <View style={[styles.themeRow, { backgroundColor: isDark ? colors.background : "#FFF0F5" }]}>
              {THEME_OPTIONS.map((opt) => {
                const isActive = theme === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.themeButton, isActive && { backgroundColor: "#FFFFFF" }]}
                    onPress={() => selectTheme(opt.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={opt.icon as keyof typeof Ionicons.glyphMap} size={16} color={isActive ? "#D4507A" : colors.textSecondary} />
                    <Text style={[styles.themeButtonText, { color: isActive ? "#D4507A" : colors.textSecondary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={[styles.settingsCard, { backgroundColor: colors.surface }]} onPress={confirmLogout} activeOpacity={0.6}>
            <View style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Drawer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shareButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  shareContent: {
    alignItems: "center",
    paddingTop: spacing.xl,
    gap: 12,
  },
  shareTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  shareSubtitle: {
    fontSize: 14,
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
    width: 44,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    width: 40,
    height: 28,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarLeft: {
    zIndex: 2,
  },
  avatarRight: {
    marginLeft: -10,
    zIndex: 1,
  },
  avatarHeart: {
    position: "absolute",
    top: -4,
    left: "50%",
    marginLeft: -2,
    zIndex: 3,
    width: 16,
    height: 16,
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
    borderRadius: 16,
    padding: 4,
  },
  themeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "500",
  },
  avatarStackLarge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    width: 110,
    height: 60,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  avatarLargeLeft: {
    zIndex: 2,
  },
  avatarLargeRight: {
    marginLeft: -16,
    zIndex: 1,
  },
  avatarHeartLarge: {
    position: "absolute",
    top: -6,
    left: "50%",
    marginLeft: -18,
    zIndex: 3,
  },
  coupleAvatarSolo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.sm,
  },
  coupleAvatarSoloPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  coupleTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: -6,
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
  menuDivider: {
    width: "100%",
    height: 1,
    marginVertical: 4,
  },
  settingsSection: {
    width: "100%",
    gap: 10,
  },
});
