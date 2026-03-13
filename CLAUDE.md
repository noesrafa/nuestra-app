# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Nuestra - App de parejas

App para parejas con calendario donde registran fotos juntos y llevan un diario de salidas.

## Stack
- **Frontend**: Expo SDK 54, Expo Router v6, TypeScript, React Native 0.81
- **Backend**: Supabase self-hosted en `https://supabase.soyrafa.dev`
- **Package manager**: bun (NO npm/yarn)
- **Path alias**: `@/*` mapea a la raíz del proyecto

## Supabase
- URL: `https://supabase.soyrafa.dev`
- Credenciales en `.env.local` (no se commitea)
- Cliente en `@/lib/supabase.ts`
- Dashboard: `https://supabase.soyrafa.dev` (user: supabase)

### Tablas (schema public)
- `profiles` - extiende auth.users, se crea automáticamente con trigger. Campos: id, display_name, avatar_url, created_at
- `nuestra_couples` - vincula 2 usuarios. Campos: id, user_a, user_b, invite_code (8 chars hex), created_at
- `nuestra_entries` - entradas del diario. Campos: id, couple_id, date, title, notes, photo_url, mood (amazing|good|okay|tough), created_by, created_at, updated_at

### Funciones SQL
- `my_couple_id()` - retorna el couple_id del usuario autenticado
- `handle_new_user()` - trigger que crea profile al signup
- `update_updated_at()` - trigger para updated_at en entries

### Storage
- Bucket `nuestra-photos` (privado) para fotos de entries

### RLS
Todas las tablas tienen Row Level Security. Cada pareja solo ve sus datos. Las policies usan `my_couple_id()` para filtrar.

### Convención multi-app
Las tablas específicas de esta app llevan prefijo `nuestra_`. La tabla `profiles` es compartida entre apps.

## Estructura del proyecto
```
app/                    # Expo Router - pantallas
  _layout.tsx           # Root layout (auth guard)
  (auth)/               # Login, signup
  (app)/                # App autenticada (stack, sin tabs)
    index.tsx           # Calendario mensual (HOME)
    day/[date].tsx      # Detalle del día (ver/subir foto)
constants/
  theme.ts              # Colores y spacing
lib/
  supabase.ts           # Cliente Supabase (expo-secure-store)
contexts/
  theme-context.tsx     # ThemeProvider (light/dark/rosa palettes)
hooks/
  use-auth.ts           # Hook de sesión
  use-couple.ts         # Couple data + invite code
  use-realtime-entries.ts # Supabase Realtime subscription for entries
  use-theme.ts          # Theme hook (colors, isDark)
  use-profile.ts        # User profile data
supabase/
  migrations/           # SQL migrations versionadas
```

## Flujo de la app
1. **Auth**: signup con email → profile se crea automático
2. **Onboarding**: crear pareja (genera invite_code) o unirse con código
3. **Home/Calendario**: vista mensual con días que tienen entries marcados
4. **Entry**: crear/ver entrada con fecha, título, notas, foto y mood
5. **Realtime**: sync entre los dos teléfonos via Supabase Realtime

## Comandos
```bash
bun install          # instalar deps
bun start            # expo start
bun run ios          # expo ios
bun run android      # expo android
bun run lint         # eslint (expo lint)
```

## Arquitectura clave

### Auth guard
`app/_layout.tsx` usa `useProtectedRoute()` que redirige basado en segmentos de Expo Router: sin sesión va a `(auth)/login`, con sesión va a `(app)/`. Toda pantalla dentro de `(app)/` requiere autenticación.

### Theme system
`ThemeProvider` en `contexts/theme-context.tsx` wrappea toda la app. Los componentes acceden a colores via `useTheme()` que retorna `{ colors, isDark, palette, setPalette }`. Hay 3 paletas definidas en `constants/theme.ts`: light, dark, rosa.

### Realtime
`useRealtimeEntries` se suscribe a cambios en `nuestra_entries` via Supabase Realtime y ejecuta un callback para refetch. Se usa en la pantalla Home para sync entre dispositivos de la pareja.

### Background removal
`lib/remove-bg.ts` usa remove.bg API (key en `EXPO_PUBLIC_REMOVE_BG_API_KEY`). Si no hay key, retorna la imagen original sin error.

## Convenciones de código
- Archivos en kebab-case: `my-component.tsx`
- Componentes en PascalCase: `export function MyComponent()`
- Hooks empiezan con `use`: `use-auth.ts`
- No usar default exports en componentes (sí en pantallas de Expo Router)
- Preferir `function` sobre arrow functions para componentes
