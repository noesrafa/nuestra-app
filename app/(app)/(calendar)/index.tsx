import { useState, useCallback, useRef, useEffect } from "react";
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";
import { getDaysInMonth, formatDate } from "@/lib/utils";
import { resolvePhotoUrls } from "@/lib/storage";
import { useRealtime } from "@/hooks/use-realtime";
import { useCouple } from "@/hooks/use-couple";
import { useSpace } from "@/hooks/use-space";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { Drawer } from "@/components/drawer";
import { DayDetailContent } from "@/components/day-detail-content";
import { SpaceStatusBanner } from "@/components/space-status-banner";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { ShareDrawerContent } from "@/components/drawers/share-drawer-content";

export default function CalendarScreen() {
  const { openDate, autoReveal: autoRevealParam } = useLocalSearchParams<{ openDate?: string; autoReveal?: string }>();
  const [pendingReveal, setPendingReveal] = useState<string | undefined>(undefined);
  const { user } = useAuth();
  const { avatarUrl } = useProfile(user?.id);
  const { colors } = useTheme();
  const { isComplete, avatars } = useCouple();
  const {
    isActive, isPaused, isPendingDelete,
    deleteRequestedAt, refetch: refetchSpace,
  } = useSpace();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<Map<string, { photo_url: string | null }>>(new Map());
  const [totalDays, setTotalDays] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [unreadLetterDates, setUnreadLetterDates] = useState<Set<string>>(new Set());
  const [songArtwork, setSongArtwork] = useState<Map<string, string>>(new Map());

  const shareDrawerRef = useRef<BottomSheet>(null);
  const dayDrawerRef = useRef<BottomSheet>(null);

  const spaceReadOnly = isPaused || isPendingDelete;

  async function loadEntries() {
    const startDate = formatDate(year, month, 1);
    const endDate = formatDate(year, month, getDaysInMonth(year, month));

    const { data } = await supabase
      .from(DB.TABLES.ENTRIES)
      .select(DB.SELECTS.ENTRY_THUMB)
      .gte("date", startDate)
      .lte("date", endDate);

    if (data) {
      setEntries(await resolvePhotoUrls(data));
    } else {
      setEntries(new Map());
    }
  }

  async function loadMonthScore() {
    const startDate = formatDate(year, month, 1);
    const endDate = formatDate(year, month, getDaysInMonth(year, month));

    const [photos, songs, hearts] = await Promise.all([
      supabase
        .from(DB.TABLES.ENTRIES)
        .select("*", { count: "exact", head: true })
        .not("photo_url", "is", null)
        .gte("date", startDate)
        .lte("date", endDate),
      supabase
        .from(DB.TABLES.LETTERS)
        .select("*", { count: "exact", head: true })
        .eq("type", "song")
        .gte("date", startDate)
        .lte("date", endDate),
      supabase
        .from(DB.TABLES.ENTRIES)
        .select("hearts")
        .gte("date", startDate)
        .lte("date", endDate),
    ]);

    const totalHearts = (hearts.data ?? []).reduce(
      (sum: number, e: { hearts: number }) => sum + (e.hearts ?? 0),
      0
    );

    setTotalDays((photos.count ?? 0) + (songs.count ?? 0) + totalHearts);
  }

  async function loadUnreadLetters() {
    if (!user) return;
    const startDate = formatDate(year, month, 1);
    const endDate = formatDate(year, month, getDaysInMonth(year, month));

    const { data } = await supabase
      .from(DB.TABLES.LETTERS)
      .select("date")
      .gte("date", startDate)
      .lte("date", endDate)
      .neq("from_user", user.id)
      .is("read_at", null);

    setUnreadLetterDates(new Set(data?.map((l: { date: string }) => l.date) ?? []));
  }

  async function loadSongArtwork() {
    if (!user) return;
    const startDate = formatDate(year, month, 1);
    const endDate = formatDate(year, month, getDaysInMonth(year, month));

    const { data } = await supabase
      .from(DB.TABLES.LETTERS)
      .select("date, spotify_artwork_url, from_user, read_at")
      .eq("type", "song")
      .not("spotify_artwork_url", "is", null)
      .gte("date", startDate)
      .lte("date", endDate);

    const map = new Map<string, string>();
    for (const row of data ?? []) {
      // Only show artwork if sent by me or already opened
      if (row.spotify_artwork_url && (row.from_user === user.id || row.read_at)) {
        map.set(row.date, row.spotify_artwork_url);
      }
    }
    setSongArtwork(map);
  }

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      loadMonthScore();
      loadUnreadLetters();
      loadSongArtwork();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month, user?.id])
  );

  // Handle deep link from sorpresas tab
  useEffect(() => {
    if (!openDate) return;
    const d = new Date(openDate + "T12:00:00");
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setPendingReveal(autoRevealParam);
    setTimeout(() => {
      setSelectedDate(openDate);
      dayDrawerRef.current?.expand();
    }, 300);
  }, [openDate, autoRevealParam]);

  useRealtime(DB.TABLES.ENTRIES, () => {
    loadEntries();
    loadMonthScore();
  });
  useRealtime(DB.TABLES.LETTERS, () => {
    loadUnreadLetters();
    loadSongArtwork();
  });
  // Couples realtime is handled by CoupleProvider — no need to subscribe here
  useRealtime(DB.TABLES.SPACES, refetchSpace);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  function openShareDrawer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    shareDrawerRef.current?.expand();
  }

  function openDayDrawer(date: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isComplete) {
      router.navigate("/(app)/(nosotros)");
      return;
    }
    setPendingReveal(undefined);
    setSelectedDate(date);
    dayDrawerRef.current?.expand();
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadEntries(), loadMonthScore(), loadUnreadLetters(), loadSongArtwork()]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <CalendarHeader
        totalDays={totalDays}
        isComplete={isComplete}
        avatars={avatars}
        avatarUrl={avatarUrl}
        onSharePress={openShareDrawer}
        onCouplePress={() => router.navigate("/(app)/(nosotros)")}
      />

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
        <CalendarGrid
          year={year}
          month={month}
          entries={entries}
          unreadLetterDates={unreadLetterDates}
          songArtwork={songArtwork}
          isActive={isActive}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onDayPress={openDayDrawer}
        />
      </ScrollView>

      <Drawer ref={shareDrawerRef}>
        <ShareDrawerContent />
      </Drawer>

      <Drawer ref={dayDrawerRef} scrollable>
        {selectedDate ? <DayDetailContent date={selectedDate} onChanged={onRefresh} readOnly={spaceReadOnly} autoReveal={pendingReveal as "sent" | "received" | undefined} /> : null}
      </Drawer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
});
