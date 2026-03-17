import { createContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { palettes, type ColorPalette } from "@/constants/theme";
import { APP } from "@/lib/constants";

export type ThemeOption = "auto" | "dark" | "rosa";
export type LayoutOption = "messy" | "tidy";

type ThemeContextType = {
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  layout: LayoutOption;
  setLayout: (layout: LayoutOption) => void;
  colors: ColorPalette;
  isDark: boolean;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeOption>("auto");
  const [layout, setLayoutState] = useState<LayoutOption>("messy");

  useEffect(() => {
    SecureStore.getItemAsync(APP.THEME_STORAGE_KEY).then((value) => {
      if (value) setThemeState(value as ThemeOption);
    });
    SecureStore.getItemAsync(APP.LAYOUT_STORAGE_KEY).then((value) => {
      if (value) setLayoutState(value as LayoutOption);
    });
  }, []);

  function setTheme(value: ThemeOption) {
    setThemeState(value);
    SecureStore.setItemAsync(APP.THEME_STORAGE_KEY, value);
  }

  function setLayout(value: LayoutOption) {
    setLayoutState(value);
    SecureStore.setItemAsync(APP.LAYOUT_STORAGE_KEY, value);
  }

  const resolved = useMemo(() => {
    if (theme === "auto") {
      const key = systemScheme === "dark" ? "dark" : "rosa";
      return { colors: palettes[key], isDark: key === "dark" };
    }
    return { colors: palettes[theme], isDark: theme === "dark" };
  }, [theme, systemScheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, layout, setLayout, ...resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
