import { createContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { palettes, type ColorPalette } from "@/constants/theme";

export type ThemeOption = "auto" | "dark" | "rosa";

type ThemeContextType = {
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  colors: ColorPalette;
  isDark: boolean;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "nuestra_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeOption>("auto");

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((value) => {
      if (value) setThemeState(value as ThemeOption);
    });
  }, []);

  function setTheme(value: ThemeOption) {
    setThemeState(value);
    SecureStore.setItemAsync(STORAGE_KEY, value);
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
