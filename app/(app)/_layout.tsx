import { useEffect } from "react";
import { Platform, Appearance } from "react-native";
import { NativeTabs, Icon, Label, VectorIcon } from "expo-router/unstable-native-tabs";
import { ThemeProvider, DefaultTheme, DarkTheme } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/hooks/use-theme";

const isIOS = Platform.OS === "ios";

export default function AppLayout() {
  const { colors, isDark } = useTheme();

  // Force the native UI to match the app's theme, not the system
  useEffect(() => {
    Appearance.setColorScheme(isDark ? "dark" : "light");
  }, [isDark]);

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, card: colors.surface, primary: colors.accent } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, card: colors.surface, primary: colors.accent } };

  return (
    <ThemeProvider value={navTheme}>
      <NativeTabs
        tintColor={colors.accent}
        iconColor={{ default: colors.textSecondary, selected: colors.accent }}
        labelStyle={{
          default: { color: colors.textSecondary },
          selected: { color: colors.accent },
        }}
        backgroundColor={colors.surface}
        indicatorColor={colors.accentLight}
        rippleColor={colors.accentLight}
      >
        <NativeTabs.Trigger name="(calendar)">
          {isIOS ? (
            <Icon sf={{ default: "calendar" as any, selected: "calendar" as any }} />
          ) : (
            <Icon src={<VectorIcon family={Ionicons} name="calendar-outline" />} />
          )}
          <Label>Calendario</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(letters)">
          {isIOS ? (
            <Icon sf={{ default: "gift" as any, selected: "gift.fill" as any }} />
          ) : (
            <Icon src={<VectorIcon family={Ionicons} name="gift-outline" />} />
          )}
          <Label>Listas</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(nosotros)">
          {isIOS ? (
            <Icon sf={{ default: "heart" as any, selected: "heart.fill" as any }} />
          ) : (
            <Icon src={<VectorIcon family={Ionicons} name="heart-outline" />} />
          )}
          <Label>Nosotros</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
