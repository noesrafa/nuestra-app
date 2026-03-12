import { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { supabase } from "@/lib/supabase";
import { colors, spacing } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = spacing.md;
const COL_GAP = 2;
const DAY_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - COL_GAP * 6) / 7;
const PHOTO_HEIGHT = DAY_WIDTH * 1.8;
const ROW_HEIGHT = PHOTO_HEIGHT + 48;
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

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

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<Map<string, string | null>>(new Map());
  const [totalDays, setTotalDays] = useState(0);

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

    const map = new Map<string, string | null>();
    data?.forEach((e: EntryThumb) => map.set(e.date, e.photo_url));
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
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
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
    bottomSheetRef.current?.expand();
  }

  async function confirmLogout() {
    bottomSheetRef.current?.close();
    await supabase.auth.signOut();
  }

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
        <View style={styles.headerSpacer} />
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
              const photoUrl = entries.get(dateStr);

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={styles.dayCell}
                  onPress={() => router.push(`/(app)/day/${dateStr}`)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                    {day}
                  </Text>

                  <Image
                    source={photoUrl ? { uri: photoUrl } : require("@/assets/masks/mask-1.png")}
                    style={styles.photo}
                    contentFit="contain"
                    transition={photoUrl ? 200 : 0}
                  />
                  <Text style={styles.plusIcon}>+</Text>
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
  headerSpacer: {
    width: 36,
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
    width: DAY_WIDTH - 4,
    height: PHOTO_HEIGHT,
    borderRadius: 4,
  },
  plusIcon: {
    fontSize: 16,
    color: "#B0B0B0",
    fontWeight: "400",
    marginTop: -3,
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
});
