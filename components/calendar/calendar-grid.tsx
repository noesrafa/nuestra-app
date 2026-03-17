import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useEffect } from "react";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getDaysInMonth, formatDate } from "@/lib/utils";

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

export function CalendarGrid({ year, month, entries, unreadLetterDates, songArtwork, isActive, onPrevMonth, onNextMonth, onDayPress }: Props) {
  const { colors, isDark } = useTheme();
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

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNextMonth();
  }

  return (
    <>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={handlePrev} style={styles.navButton}>
          <Text style={[styles.navText, { color: colors.accent }]}>{"\u2039"}</Text>
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.accent }]}>{formatMonth(year, month)}</Text>
        <TouchableOpacity onPress={handleNext} style={styles.navButton}>
          <Text style={[styles.navText, { color: colors.accent }]}>{"\u203A"}</Text>
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
});
