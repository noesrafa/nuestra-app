export const colors = {
  background: "#FFF8F6",
  surface: "#FFFFFF",
  accent: "#E8A0BF",
  accentLight: "#F5D5E5",
  text: "#2D2D2D",
  textSecondary: "#999999",
  border: "#F0E8E5",
  today: "#E8A0BF",
  hasPhoto: "#E8A0BF",
};

export type ColorPalette = typeof colors;

export const palettes: Record<"light" | "dark" | "rosa", ColorPalette> = {
  light: colors,
  dark: {
    background: "#121212",
    surface: "#1E1E1E",
    accent: "#E8A0BF",
    accentLight: "#3D2A35",
    text: "#F0F0F0",
    textSecondary: "#888888",
    border: "#333333",
    today: "#E8A0BF",
    hasPhoto: "#E8A0BF",
  },
  rosa: {
    background: "#FFF0F5",
    surface: "#FFF8FA",
    accent: "#FF69B4",
    accentLight: "#FFD6E8",
    text: "#4A2040",
    textSecondary: "#B07090",
    border: "#FFD6E8",
    today: "#FF69B4",
    hasPhoto: "#FF69B4",
  },
};

export const moods = {
  amazing: { emoji: "🤩", label: "Increíble" },
  good: { emoji: "😊", label: "Bien" },
  okay: { emoji: "😐", label: "Normal" },
  tough: { emoji: "😔", label: "Difícil" },
} as const;

export type Mood = keyof typeof moods;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
