export const colors = {
  background: "#FDF6F7",
  surface: "#FFFFFF",
  accent: "#8B2252",
  accentLight: "#E8C4D0",
  text: "#2D2D2D",
  textSecondary: "#888888",
  border: "#EDE0E3",
  today: "#8B2252",
  hasPhoto: "#8B2252",
  gradientStart: "#B8446A",
  gradientEnd: "#8B2252",
};

export type ColorPalette = typeof colors;

export const palettes: Record<"rosa" | "dark", ColorPalette> = {
  rosa: {
    background: "#F5E6EA",
    surface: "#FDF6F7",
    accent: "#8B2252",
    accentLight: "#E8C4D0",
    text: "#2D2D2D",
    textSecondary: "#888888",
    border: "#EDE0E3",
    today: "#8B2252",
    hasPhoto: "#8B2252",
    gradientStart: "#B8446A",
    gradientEnd: "#8B2252",
  },
  dark: {
    background: "#1A0A10",
    surface: "#2A1520",
    accent: "#D4638A",
    accentLight: "#3D2030",
    text: "#F0E4E8",
    textSecondary: "#A07080",
    border: "#3D2030",
    today: "#D4638A",
    hasPhoto: "#D4638A",
    gradientStart: "#D4638A",
    gradientEnd: "#8B2252",
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const SEMANTIC_COLORS = {
  DANGER: "#EF4444",
  DANGER_TEXT: "#FF3B30",
  WARNING_BG: "#FEF3C7",
  WARNING_TEXT: "#92400E",
  ERROR_BG: "#FEE2E2",
  ERROR_TEXT: "#991B1B",
} as const;
