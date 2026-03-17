import { View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet, Dimensions, Modal, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useEffect, useState, useRef, useCallback } from "react";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getDaysInMonth, formatDate } from "@/lib/utils";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const YEAR_START = 2020;
const NOW = new Date();
const YEAR_END = NOW.getFullYear();
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => String(YEAR_START + i));
const WHEEL_ITEM_H = 44;
const WHEEL_VISIBLE = 5;
const WHEEL_H = WHEEL_ITEM_H * WHEEL_VISIBLE;
const WHEEL_PAD = WHEEL_ITEM_H * 2; // padding top/bottom so selected is centered

type WheelProps = {
  items: string[];
  selectedIndex: number;
  onIndexChange: (i: number) => void;
  textColor: string;
  accentBg: string;
  style?: object;
};

function Wheel({ items, selectedIndex, onIndexChange, textColor, accentBg, style }: WheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const mounted = useRef(false);

  useEffect(() => {
    // Scroll to initial position after layout
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_H, animated: false });
      mounted.current = true;
    }, 10);
    return () => clearTimeout(timer);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / WHEEL_ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    onIndexChange(clamped);
  }, [items.length, onIndexChange]);

  return (
    <View style={[{ height: WHEEL_H, overflow: "hidden" }, style]}>
      <View style={{
        position: "absolute", top: WHEEL_PAD, left: 0, right: 0,
        height: WHEEL_ITEM_H, backgroundColor: accentBg, borderRadius: 12,
        zIndex: 0,
      }} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
      >
        {items.map((item, i) => (
          <View key={i} style={{ height: WHEEL_ITEM_H, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 18, color: textColor, opacity: i === selectedIndex ? 1 : 0.4 }}>
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = spacing.md;
const COL_GAP = 2;
const DAY_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - COL_GAP * 6) / 7;
const PHOTO_HEIGHT = DAY_WIDTH * 1.5;
const ROW_HEIGHT = PHOTO_HEIGHT + 48;
const DAYS = ["D", "L", "M", "M", "J", "V", "S"];
const masksContext = require.context("../../assets/masks", false, /\.png$/);
const MASKS = masksContext.keys().map((key: string) => masksContext(key));

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatMonth(year: number, month: number) {
  const date = new Date(year, month);
  const name = date.toLocaleDateString("es", { month: "long" });
  return `${name} ${year}`;
}

type Props = {
  year: number;
  month: number;
  entries: Map<string, { photo_url: string | null }>;
  unreadLetterDates?: Set<string>;
  songArtwork?: Map<string, string>;
  isActive: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthYearChange: (year: number, month: number) => void;
  onDayPress: (date: string) => void;
};

function PulsingDay({ day, color }: { day: number; color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.dayNumber, styles.dayNumberToday, { color }, animStyle]}>
      {day}
    </Animated.Text>
  );
}

export function CalendarGrid({ year, month, entries, unreadLetterDates, songArtwork, isActive, onPrevMonth, onNextMonth, onMonthYearChange, onDayPress }: Props) {
  const { colors, isDark } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [pickerMonthIdx, setPickerMonthIdx] = useState(month);
  const [pickerYearIdx, setPickerYearIdx] = useState(YEARS.indexOf(String(year)));
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < 4; i++) cells.push(null);
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  const lastRow = rows[rows.length - 1];
  while (lastRow.length < 7) lastRow.push(null);

  function handlePrev() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPrevMonth();
  }

  const isAtMax = year === NOW.getFullYear() && month >= NOW.getMonth();

  function handleNext() {
    if (isAtMax) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNextMonth();
  }

  return (
    <>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={handlePrev} style={styles.navButton}>
          <Text style={[styles.navText, { color: colors.accent }]}>{"\u2039"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setPickerMonthIdx(month);
          setPickerYearIdx(Math.max(0, YEARS.indexOf(String(year))));
          setPickerKey(k => k + 1);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setPickerVisible(true);
        }}>
          <Text style={[styles.monthText, { color: colors.accent }]}>{formatMonth(year, month)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={styles.navButton} disabled={isAtMax}>
          <Text style={[styles.navText, { color: colors.accent, opacity: isAtMax ? 0.2 : 1 }]}>{"\u203A"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeader}>
        {DAYS.map((d, i) => (
          <Text key={i} style={[styles.weekDay, { color: colors.accent, opacity: 0.6 }]}>{d}</Text>
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
            const artworkUrl = !photoUrl ? songArtwork?.get(dateStr) : undefined;
            const hasUnreadLetter = unreadLetterDates?.has(dateStr) ?? false;
            const displayImage = photoUrl || artworkUrl;

            return (
              <TouchableOpacity
                key={dateStr}
                style={styles.dayCell}
                onPress={() => onDayPress(dateStr)}
                activeOpacity={0.7}
              >
                {hasUnreadLetter ? (
                  <PulsingDay day={day} color={colors.accent} />
                ) : (
                  <Text style={[styles.dayNumber, { color: colors.accent, opacity: isToday ? 1 : 0.4 }, isToday && styles.dayNumberToday]}>
                    {day}
                  </Text>
                )}
                {artworkUrl ? (
                  <View style={styles.vinylCase}>
                    {/* Vinyl disc peeking out from top */}
                    <View style={[styles.vinylDisc, { backgroundColor: isDark ? '#1F0B11' : '#1A1A1A' }]}>
                      <View style={styles.vinylGroove}>
                        <View style={styles.vinylHole} />
                      </View>
                    </View>
                    {/* Album cover sleeve */}
                    <Image
                      source={{ uri: artworkUrl }}
                      style={styles.albumCover}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                ) : (
                  <Image
                    source={displayImage ? { uri: displayImage } : MASKS[((day * 31 + month * 97 + year * 53) * 2654435761 >>> 0) % MASKS.length]}
                    style={styles.photo}
                    contentFit={displayImage ? "cover" : "contain"}
                    transition={displayImage ? 200 : 0}
                  />
                )}
                {isActive && <Text style={[styles.plusIcon, { color: colors.accent, opacity: 0.6 }]}>+</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <View style={{ height: 40 }} />

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
          <View />
        </Pressable>
        <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Text style={[styles.pickerAction, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  onMonthYearChange(NOW.getFullYear(), NOW.getMonth());
                  setPickerVisible(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={[styles.pickerBtn, { borderColor: colors.accent }]}
              >
                <Text style={[styles.pickerBtnText, { color: colors.accent }]}>Hoy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const selYear = Number(YEARS[pickerYearIdx]);
                  const maxMonth = selYear === NOW.getFullYear() ? NOW.getMonth() : 11;
                  const selMonth = Math.min(pickerMonthIdx, maxMonth);
                  onMonthYearChange(selYear, selMonth);
                  setPickerVisible(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={[styles.pickerBtn, { borderColor: colors.accent, backgroundColor: colors.accent }]}
              >
                <Text style={[styles.pickerBtnText, { color: colors.surface }]}>Ir</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.pickerWheels}>
            <Wheel
              key={`m-${pickerKey}-${pickerYearIdx}`}
              items={Number(YEARS[pickerYearIdx]) === NOW.getFullYear()
                ? MONTHS.slice(0, NOW.getMonth() + 1)
                : MONTHS}
              selectedIndex={Math.min(pickerMonthIdx, Number(YEARS[pickerYearIdx]) === NOW.getFullYear() ? NOW.getMonth() : 11)}
              onIndexChange={setPickerMonthIdx}
              textColor={colors.accent}
              accentBg={colors.accentLight}
              style={{ flex: 1 }}
            />
            <Wheel
              key={`y-${pickerKey}`}
              items={YEARS}
              selectedIndex={pickerYearIdx}
              onIndexChange={(idx) => {
                setPickerYearIdx(idx);
                if (Number(YEARS[idx]) === NOW.getFullYear() && pickerMonthIdx > NOW.getMonth()) {
                  setPickerMonthIdx(NOW.getMonth());
                }
              }}
              textColor={colors.accent}
              accentBg={colors.accentLight}
              style={{ width: 100 }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  vinylCase: {
    width: DAY_WIDTH - 8,
    height: PHOTO_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  vinylDisc: {
    width: DAY_WIDTH - 14,
    height: DAY_WIDTH - 14,
    borderRadius: (DAY_WIDTH - 14) / 2,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -(DAY_WIDTH - 14) * 0.4,
  },
  vinylGroove: {
    width: (DAY_WIDTH - 16) * 0.6,
    height: (DAY_WIDTH - 16) * 0.6,
    borderRadius: (DAY_WIDTH - 16) * 0.3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  vinylHole: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  albumCover: {
    width: DAY_WIDTH - 8,
    height: DAY_WIDTH - 8,
    borderRadius: 0,
    zIndex: 1,
  },
  plusIcon: {
    fontSize: 16,
    fontWeight: "400",
    marginTop: 2,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pickerAction: {
    fontSize: 16,
  },
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickerBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  pickerWheels: {
    flexDirection: "row",
    paddingHorizontal: 20,
    height: 220,
    alignItems: "center",
  },
});
