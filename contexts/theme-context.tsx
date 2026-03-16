import { createContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { palettes, type ColorPalette } from "@/constants/theme";
import { APP } from "@/lib/constants";

export type ThemeOption = "auto" | "dark" | "rosa";

type ThemeContextType = {
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  colors: ColorPalette;
  isDark: boolean;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeOption>("auto");

  useEffect(() => {
    SecureStore.getItemAsync(APP.THEME_STORAGE_KEY).then((value) => {
      if (value) setThemeState(value as ThemeOption);
    });
  }, []);

  function setTheme(value: ThemeOption) {
    setThemeState(value);
    SecureStore.setItemAsync(APP.THEME_STORAGE_KEY, value);
  }

  const resolved = useMemo(() => {
    if (theme === "auto") {
      const key = systemScheme === "dark" ? "dark" : "rosa";
      return { colors: palettes[key], isDark: key === "dark" };
    }
    return { colors: palettes[theme], isDark: theme === "dark" };
  }, [theme, systemScheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, ...resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
