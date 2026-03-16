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
import { useSpace } from "@/hooks/use-space";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { LinearGradient } from "expo-linear-gradient";
import { Drawer } from "@/components/drawer";
import { DayDetailContent } from "@/components/day-detail-content";
import { SpaceStatusBanner } from "@/components/space-status-banner";
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
  { key: "rosa", label: "Claro", icon: "sunny-outline" },
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
  const { inviteCode: existingCode, isComplete, avatars, refetch: refetchCouple } = useCouple();
  const {
    isActive,
    isPaused,
    isPendingDelete,
    pausedBy,
    deleteRequestedBy,
    deleteRequestedAt,
    canFinalizeDelete,
    refetch: refetchSpace,
  } = useSpace();

  const shareDrawerRef = useRef<BottomSheet>(null);
  const dayDrawerRef = useRef<BottomSheet>(null);
  const coupleDrawerRef = useRef<BottomSheet>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [coupleMode, setCoupleMode] = useState<"home" | "join">("home");
  const [joinCode, setJoinCode] = useState("");
  const [coupleLoading, setCoupleLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [spaceLoading, setSpaceLoading] = useState(false);
  const spaceReadOnly = isPaused || isPendingDelete;


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
    if (!isComplete) {
      openCoupleDrawer();
      return;
    }
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

  async function handlePauseSpace() {
    setSpaceLoading(true);
    const { error } = await supabase.rpc("pause_space");
    setSpaceLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    refetchSpace();
  }

  async function handleUnpauseSpace() {
    setSpaceLoading(true);
    const { error } = await supabase.rpc("unpause_space");
    setSpaceLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    refetchSpace();
  }

  async function handleRequestDelete() {
    Alert.alert(
      "Eliminar todo",
      "Esto iniciará la eliminación del espacio. Tu pareja tendrá 24h para confirmar o cancelar.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Solicitar eliminación",
          style: "destructive",
          onPress: async () => {
            setSpaceLoading(true);
            const { error } = await supabase.rpc("request_delete_space");
            setSpaceLoading(false);
            if (error) { Alert.alert("Error", error.message); return; }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            refetchSpace();
          },
        },
      ]
    );
  }

  async function handleCancelDelete() {
    setSpaceLoading(true);
    const { error } = await supabase.rpc("cancel_delete_space");
    setSpaceLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    refetchSpace();
  }

  async function deleteSpaceWithPhotos() {
    Alert.alert(
      "Eliminar definitivamente",
      "Se borrarán todas las fotos y entries. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar todo",
          style: "destructive",
          onPress: async () => {
            setSpaceLoading(true);
            try {
              // 1. List entries with photos
              const { data: entriesWithPhotos } = await supabase
                .from("nuestra_entries")
                .select("photo_url")
                .not("photo_url", "is", null);

              // 2. Delete photos from storage
              if (entriesWithPhotos && entriesWithPhotos.length > 0) {
                const paths = entriesWithPhotos
                  .map((e) => e.photo_url)
                  .filter((p): p is string => !!p && !p.startsWith("http"));
                if (paths.length > 0) {
                  await supabase.storage.from("nuestra-photos").remove(paths);
                }
              }

              // 3. Confirm delete (DB handles entries + unlink)
              const { error } = await supabase.rpc("confirm_delete_space");
              if (error) { Alert.alert("Error", error.message); return; }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              refetchCouple();
              refetchSpace();
              coupleDrawerRef.current?.close();
            } finally {
              setSpaceLoading(false);
            }
          },
        },
      ]
    );
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
    refetchSpace();
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
          <Ionicons name="heart" size={18} color={colors.text} />
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
                style={[styles.avatarSmall, styles.avatarLeft, { borderColor: colors.surface }]}
                contentFit="cover"
              />
              <Image
                source={{ uri: avatars[1] }}
                style={[styles.avatarSmall, styles.avatarRight, { borderColor: colors.surface }]}
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

      {(isPaused || isPendingDelete) && (
        <SpaceStatusBanner status={isPaused ? "paused" : "pending_delete"} deleteRequestedAt={deleteRequestedAt} />
      )}

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
                  {isActive && <Text style={[styles.plusIcon, { color: colors.textSecondary }]}>+</Text>}
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
        {selectedDate ? <DayDetailContent date={selectedDate} onChanged={onRefresh} readOnly={spaceReadOnly} /> : null}
      </Drawer>

      {/* Couple drawer */}
      <Drawer ref={coupleDrawerRef} snapPoints={["75%"]} scrollable>
        {isComplete ? (
          <>
            <View style={[styles.avatarCard, { backgroundColor: colors.background }]}>
              <View style={styles.avatarStackLarge}>
                <Image
                  source={{ uri: avatars[0] ?? undefined }}
                  style={[styles.avatarLarge, styles.avatarLargeLeft, { borderColor: colors.background }]}
                  contentFit="cover"
                />
                <Image
                  source={{ uri: avatars[1] ?? undefined }}
                  style={[styles.avatarLarge, styles.avatarLargeRight, { borderColor: colors.background }]}
                  contentFit="cover"
                />
                <View style={styles.avatarHeartLarge}>
                  <Image source={require("../../assets/icons-3d/heart.png")} style={{ width: 24, height: 24 }} contentFit="contain" />
                </View>
              </View>

              {isActive && (
                <>
                  <Text style={[styles.coupleTitle, { color: colors.text }]}>Vinculados</Text>
                  <Text style={[styles.coupleSubtitle, { color: colors.textSecondary }]}>Ya estan conectados como pareja</Text>
                </>
              )}

              {isPaused && (
                <>
                  <Text style={[styles.coupleTitle, { color: colors.text }]}>Espacio en pausa</Text>
                  <Text style={[styles.coupleSubtitle, { color: colors.textSecondary }]}>
                    {pausedBy === user?.id ? "Pausaste el espacio. Podés reactivarlo." : "Tu pareja pausó el espacio"}
                  </Text>
                </>
              )}

              {isPendingDelete && (
                <>
                  <Text style={[styles.coupleTitle, { color: colors.text }]}>Eliminación pendiente</Text>
                  <Text style={[styles.coupleSubtitle, { color: colors.textSecondary }]}>
                    {deleteRequestedBy === user?.id
                      ? "Esperando confirmación de tu pareja o 24h"
                      : "Tu pareja quiere eliminar el espacio"}
                  </Text>
                </>
              )}
            </View>
          </>
        ) : (
          <View key={coupleMode} style={[styles.avatarCard, { backgroundColor: colors.background }]}>
            {coupleMode === "join" ? (
              <>
                <Ionicons name="link" size={32} color={colors.accent} />
                <Text style={[styles.coupleTitle, { color: colors.text }]}>Unirse</Text>
                <Text style={[styles.coupleSubtitle, { color: colors.textSecondary }]}>Ingresa el codigo que te compartieron</Text>
                <TextInput
                  style={[styles.coupleInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
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
                    colors={[colors.gradientStart, colors.gradientEnd]}
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
                <TouchableOpacity onPress={() => setCoupleMode("home")} activeOpacity={0.7} style={[styles.outlineBtn, { borderColor: colors.accent }]}>
                  <Text style={[styles.outlineBtnText, { color: colors.accent }]}>Volver</Text>
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
                  <TouchableOpacity onPress={copyCode} activeOpacity={0.7} style={[styles.coupleCodeBox, { borderColor: colors.border }]}>
                    <Text style={[styles.coupleCode, { color: colors.accent }]}>
                      {codeCopied ? "COPIADO!" : existingCode.toUpperCase()}
                    </Text>
                    <Ionicons name={codeCopied ? "checkmark-circle" : "copy-outline"} size={20} color={colors.accent} />
                  </TouchableOpacity>
                ) : (
                  <ActivityIndicator color={colors.accent} style={{ paddingVertical: 20 }} />
                )}
                {codeCopied && <Text style={[styles.coupleHint, { color: colors.textSecondary }]}>Enviaselo a tu pareja</Text>}
                <TouchableOpacity onPress={() => setCoupleMode("join")} activeOpacity={0.8} style={styles.couplePrimaryBtn}>
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
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
          </View>
        )}

        {/* Espacio section - only when couple is complete */}
        {isComplete && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Espacio</Text>
            <View style={[styles.card, { backgroundColor: colors.background }]}>
              {isActive && (
                <TouchableOpacity onPress={handlePauseSpace} disabled={spaceLoading} activeOpacity={0.6} style={styles.cardRow}>
                  <Ionicons name="pause-circle-outline" size={20} color={colors.accent} />
                  <Text style={[styles.cardRowText, { color: colors.text }]}>Pausar espacio</Text>
                  {spaceLoading && <ActivityIndicator color={colors.accent} size="small" style={{ marginLeft: "auto" }} />}
                </TouchableOpacity>
              )}
              {isPaused && pausedBy === user?.id && (
                <TouchableOpacity onPress={handleUnpauseSpace} disabled={spaceLoading} activeOpacity={0.6} style={styles.cardRow}>
                  <Ionicons name="play-circle-outline" size={20} color={colors.accent} />
                  <Text style={[styles.cardRowText, { color: colors.text }]}>Reactivar espacio</Text>
                  {spaceLoading && <ActivityIndicator color={colors.accent} size="small" style={{ marginLeft: "auto" }} />}
                </TouchableOpacity>
              )}
              {(isPaused || isPendingDelete) && (
                <>
                  {(isPaused || (isPendingDelete && deleteRequestedBy !== user?.id)) && (
                    <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                  )}
                  {isPendingDelete && canFinalizeDelete && (
                    <TouchableOpacity onPress={deleteSpaceWithPhotos} disabled={spaceLoading} activeOpacity={0.6} style={styles.cardRow}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      <Text style={[styles.cardRowText, { color: "#EF4444" }]}>Eliminar definitivamente</Text>
                      {spaceLoading && <ActivityIndicator color="#EF4444" size="small" style={{ marginLeft: "auto" }} />}
                    </TouchableOpacity>
                  )}
                  {isPendingDelete && !canFinalizeDelete && deleteRequestedBy !== user?.id && (
                    <TouchableOpacity onPress={deleteSpaceWithPhotos} disabled={spaceLoading} activeOpacity={0.6} style={styles.cardRow}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      <Text style={[styles.cardRowText, { color: "#EF4444" }]}>Confirmar eliminación</Text>
                      {spaceLoading && <ActivityIndicator color="#EF4444" size="small" style={{ marginLeft: "auto" }} />}
                    </TouchableOpacity>
                  )}
                  {isPendingDelete && (
                    <>
                      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                      <TouchableOpacity onPress={handleCancelDelete} disabled={spaceLoading} activeOpacity={0.6} style={styles.cardRow}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                        <Text style={[styles.cardRowText, { color: colors.textSecondary }]}>Cancelar eliminación</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {isPaused && (
                    <TouchableOpacity onPress={handleRequestDelete} disabled={spaceLoading} activeOpacity={0.6} style={styles.cardRow}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      <Text style={[styles.cardRowText, { color: "#EF4444" }]}>Eliminar todo</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {/* Apariencia section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Apariencia</Text>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <View style={[styles.themeRow, { backgroundColor: colors.background }]}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.themeButton,
                    active && [styles.themeButtonActive, { backgroundColor: colors.surface, borderColor: colors.border }],
                  ]}
                  onPress={() => selectTheme(opt.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={opt.icon as keyof typeof Ionicons.glyphMap} size={15} color={active ? colors.accent : colors.textSecondary} />
                  <Text style={[styles.themeButtonText, { color: active ? colors.text : colors.textSecondary }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cuenta section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cuenta</Text>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <View style={styles.cardRow}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardRowText, { color: colors.text }]}>{displayName ?? "Sin nombre"}</Text>
              <Text style={[styles.cardRowSubtext, { color: colors.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>
          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity onPress={confirmLogout} activeOpacity={0.6} style={styles.cardRow}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[styles.cardRowText, { color: "#EF4444" }]}>Cerrar sesión</Text>
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  cardRowText: {
    fontSize: 15,
    fontWeight: "500",
  },
  cardRowSubtext: {
    fontSize: 13,
    marginTop: 1,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  themeRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
  },
  themeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
  },
  themeButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  themeButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  avatarCard: {
    width: "100%",
    borderRadius: 14,
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 8,
  },
  avatarStackLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
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
    top: -2,
    alignSelf: "center",
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
    marginBottom: 4,
  },
  coupleSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
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
    marginVertical: 8,
  },
  coupleCode: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
  },
  coupleHint: {
    fontSize: 12,
  },
  outlineBtn: {
    width: "100%",
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: "600",
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
});
