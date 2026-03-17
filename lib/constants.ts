export const DB = {
  TABLES: {
    ENTRIES: "nuestra_entries",
    COUPLES: "nuestra_couples",
    SPACES: "nuestra_spaces",
    LETTERS: "nuestra_letters",
    SPOTIFY_TOKENS: "nuestra_spotify_tokens",
    PROFILES: "profiles",
  },
  SELECTS: {
    ENTRY_FULL: "id, date, title, photo_url, notes, hearts",
    ENTRY_THUMB: "date, photo_url",
    COUPLE_FULL: "id, user_a, user_b, invite_code, nickname_a, nickname_b",
    LETTER_FULL: "id, couple_id, date, from_user, type, body, read_at, created_at, spotify_track_id, spotify_track_name, spotify_artist_name, spotify_artwork_url, spotify_preview_url, spotify_external_url",
    PROFILE_AVATAR: "id, avatar_url",
    PROFILE_DISPLAY: "display_name, avatar_url",
  },
} as const;

export const STORAGE = {
  BUCKET: "nuestra-photos",
  SIGNED_URL_EXPIRY: 3600,
} as const;

export const IMAGE = {
  RESIZE_WIDTH: 1024,
  COMPRESS_QUALITY: 0.8,
  PICKER_ASPECT: [3, 4] as [number, number],
} as const;

export const APP = {
  SCHEME: "nuestraapp",
  AUTH_CALLBACK: "nuestraapp://auth-callback",
  THEME_STORAGE_KEY: "nuestra_theme",
  INVITE_CODE_LENGTH: 8,
  DELETION_WINDOW_MS: 24 * 60 * 60 * 1000,
  DEBOUNCE_SAVE_MS: 1000,
} as const;

export const SPOTIFY = {
  SCOPES: [
    "user-read-private",
    "user-read-email",
  ],
  REDIRECT_URI: "nuestraapp://spotify-callback",
  SEARCH_LIMIT: 10,
  AUTH_URL: "https://accounts.spotify.com/authorize",
  TOKEN_URL: "https://accounts.spotify.com/api/token",
  API_BASE: "https://api.spotify.com/v1",
} as const;

// SEMANTIC_COLORS moved to constants/theme.ts
export { SEMANTIC_COLORS } from "@/constants/theme";
