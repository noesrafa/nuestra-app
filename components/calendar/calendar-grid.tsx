import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getDaysInMonth, formatDate } from "@/lib/utils";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = spacing.md;
const COL_GAP = 2;
const DAY_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - COL_GAP * 6) / 7;
const PHOTO_HEIGHT = DAY_WIDTH * 1.5;
const ROW_HEIGHT = PHOTO_HEIGHT + 48;
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const masksContext = require.context("../../assets/masks", false, /\.png$/);
const MASKS = masksContext.keys().map((key: string) => masksContext(key));

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatMonth(year: number, month: number) {
  const date = new Date(year, month);
  const name = date.toLocaleDateString("en", { month: "short" });
  return `${name} ${year}`;
}

type Props = {
  year: number;
  month: number;
  entries: Map<string, { photo_url: string | null }>;
  isActive: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayPress: (date: string) => void;
};

export function CalendarGrid({ year, month, entries, isActive, onPrevMonth, onNextMonth, onDayPress }: Props) {
  const { colors } = useTheme();
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

            return (
              <TouchableOpacity
                key={dateStr}
                style={styles.dayCell}
                onPress={() => onDayPress(dateStr)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayNumber, { color: colors.accent, opacity: isToday ? 1 : 0.4 }, isToday && styles.dayNumberToday]}>
                  {day}
                </Text>
                <Image
                  source={photoUrl ? { uri: photoUrl } : MASKS[((day * 31 + month * 97 + year * 53) * 2654435761 >>> 0) % MASKS.length]}
                  style={styles.photo}
                  contentFit="contain"
                  transition={photoUrl ? 200 : 0}
                />
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
  plusIcon: {
    fontSize: 16,
    fontWeight: "400",
    marginTop: 2,
    lineHeight: 18,
  },
});
