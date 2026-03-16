import { useState, useCallback, useRef } from "react";
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";
import { supabase } from "@/lib/supabase";
import { DB } from "@/lib/constants";
import { getDaysInMonth, formatDate } from "@/lib/utils";
import { resolvePhotoUrls } from "@/lib/storage";
import { useRealtimeEntries } from "@/hooks/use-realtime-entries";
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
import { CoupleDrawerContent } from "@/components/drawers/couple-drawer-content";
import { ShareDrawerContent } from "@/components/drawers/share-drawer-content";

export default function CalendarScreen() {
  const { user } = useAuth();
  const { avatarUrl } = useProfile(user?.id);
  const { colors } = useTheme();
  const { isComplete, avatars, refetch: refetchCouple } = useCouple();
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

  const shareDrawerRef = useRef<BottomSheet>(null);
  const dayDrawerRef = useRef<BottomSheet>(null);
  const coupleDrawerRef = useRef<BottomSheet>(null);

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

  async function loadTotalDays() {
    const { count } = await supabase
      .from(DB.TABLES.ENTRIES)
      .select("*", { count: "exact", head: true })
      .not("photo_url", "is", null);
    setTotalDays(count ?? 0);
  }

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      loadTotalDays();
    }, [year, month])
  );

  useRealtimeEntries(() => {
    loadEntries();
    loadTotalDays();
    refetchSpace();
  });

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

  function openCoupleDrawer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    coupleDrawerRef.current?.expand();
  }

  function openDayDrawer(date: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isComplete) { openCoupleDrawer(); return; }
    setSelectedDate(date);
    dayDrawerRef.current?.expand();
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadEntries(), loadTotalDays()]);
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
        onCouplePress={openCoupleDrawer}
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
        {selectedDate ? <DayDetailContent date={selectedDate} onChanged={onRefresh} readOnly={spaceReadOnly} /> : null}
      </Drawer>

      <Drawer ref={coupleDrawerRef} scrollable>
        <CoupleDrawerContent
          onClose={() => coupleDrawerRef.current?.close()}
          onMutate={() => { refetchCouple(); refetchSpace(); loadEntries(); loadTotalDays(); }}
        />
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
