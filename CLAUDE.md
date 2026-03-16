# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Nuestra - App de parejas

App para parejas con calendario donde registran fotos juntos y llevan un diario de salidas.

## Stack
- **Frontend**: Expo SDK 54, Expo Router v6, TypeScript, React Native 0.81
- **Styling**: NativeWind v4 + Tailwind CSS 3.3.2 (className support on RN components)
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
app/                              # Expo Router - pantallas
  _layout.tsx                     # Root layout (auth guard, imports global.css)
  (auth)/login.tsx, signup.tsx    # Thin wrappers → AuthForm
  (app)/index.tsx                 # Calendario, compone sub-componentes
  (app)/day/[date].tsx            # Thin wrapper → DayDetailContent
components/
  auth/auth-form.tsx              # Formulario login/signup unificado (usa theme)
  calendar/calendar-grid.tsx      # Grilla mensual, celdas, masks, fotos
  calendar/calendar-header.tsx    # Share button, heart counter, avatar stack
  drawers/couple-drawer-content.tsx # Compositor: CoupleCard + SpaceSection + ThemeSection + AccountSection
  drawers/couple-card.tsx         # Vinculación de pareja (código, join)
  drawers/space-section.tsx       # Pausar/reactivar/eliminar espacio
  drawers/theme-section.tsx       # Selector de tema (auto/claro/dark)
  drawers/account-section.tsx     # Perfil + cerrar sesión
  drawers/share-drawer-content.tsx  # Placeholder compartir
  ui/avatar-stack.tsx             # Avatares superpuestos con corazón (small/large)
  ui/card-row.tsx                 # Fila estilo settings (icon + text + trailing)
  ui/gradient-button.tsx          # Botón con LinearGradient
  day-detail-content.tsx          # Vista/edición de entry (canónica)
  drawer.tsx                      # BottomSheet wrapper
  space-status-banner.tsx         # Banner pausa/eliminación
constants/
  theme.ts                        # Paletas de colores, spacing, y SEMANTIC_COLORS
lib/
  types.ts                        # Tipos de dominio: Entry, Couple, Space, MemberProfile
  utils.ts                        # Helpers puros: formatDisplayDate, getDaysInMonth, formatDate
  storage.ts                      # Signed URL helpers: resolvePhotoUrl, resolvePhotoUrls
  constants.ts                    # DB tables/selects, storage config, image config, app config
  supabase.ts                     # Cliente Supabase (expo-secure-store)
contexts/
  theme-context.tsx               # ThemeProvider (auto/dark/rosa)
hooks/
  use-auth.ts                     # Sesión
  use-couple.ts                   # Couple data + invite code
  use-entry-manager.ts            # CRUD entry, debounce save, hearts, animation
  use-google-auth.ts              # Google OAuth
  use-photo-upload.ts             # Upload, gallery pick, clipboard paste
  use-profile.ts                  # User profile
  use-realtime-entries.ts         # Supabase Realtime subscription
  use-space.ts                    # Space status (active/paused/pending_delete)
  use-space-actions.ts            # Pause, unpause, delete space operations
  use-theme.ts                    # Theme context hook
supabase/
  migrations/                     # SQL migrations versionadas
```

### Módulos clave en lib/
- **`lib/types.ts`** — Tipos de dominio (`Entry`, `Couple`, `Space`, `MemberProfile`). Los hooks importan de aquí, no definen tipos inline.
- **`lib/utils.ts`** — Funciones puras de formato y cálculo (`formatDisplayDate`, `getDaysInMonth`, `formatDate`). Usadas por hooks y componentes.
- **`lib/storage.ts`** — Helpers para signed URLs de Supabase Storage (`resolvePhotoUrl` para una foto, `resolvePhotoUrls` para batch). Encapsula la lógica de "si no empieza con http, generar signed URL".
- **`lib/constants.ts`** — Single source of truth para nombres de tablas (`DB.TABLES`), selects (`DB.SELECTS`), bucket de storage (`STORAGE`), parámetros de imagen (`IMAGE`), y configuración de la app (`APP`). Re-exporta `SEMANTIC_COLORS` desde `constants/theme.ts`.

### Constantes de colores
`constants/theme.ts` contiene las paletas (`rosa`, `dark`), el spacing, y `SEMANTIC_COLORS` (danger, warning, error). Es el único lugar donde se definen colores. `lib/constants.ts` re-exporta `SEMANTIC_COLORS` por conveniencia.

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
`app/_layout.tsx` redirige basado en segmentos de Expo Router: sin sesión va a `(auth)/login`, con sesión va a `(app)/`. Toda pantalla dentro de `(app)/` requiere autenticación.

### Theme system
`ThemeProvider` en `contexts/theme-context.tsx` wrappea toda la app. Los componentes acceden a colores via `useTheme()` que retorna `{ colors, isDark, theme, setTheme }`. Hay 2 paletas definidas en `constants/theme.ts`: rosa (light), dark. El modo "auto" sigue el sistema. NativeWind está configurado para className-based styling (gradual adoption).

### Realtime
`useRealtimeEntries` se suscribe a cambios en `nuestra_entries` via Supabase Realtime. Solo se usa en el parent (`index.tsx`) que pasa callbacks a los hijos. Evitar suscripciones duplicadas en componentes hijos.

### Day detail architecture
`DayDetailContent` es el componente canónico para ver/editar entries. Usa `useEntryManager` (estado + CRUD) y `usePhotoUpload` (subida + galería + clipboard). Se usa tanto en el drawer del Home como en la pantalla standalone `day/[date].tsx`.

### Couple drawer architecture
`CoupleDrawerContent` es un compositor que orquesta 4 sub-componentes independientes:
- `CoupleCard` — vinculación/código de pareja
- `SpaceSection` — pausar/eliminar/reactivar
- `ThemeSection` — selector de tema
- `AccountSection` — perfil + logout

## Documentación Expo para consulta
Cuando necesites consultar docs de Expo, usa estas URLs con WebFetch:
- **Página específica en markdown**: agregar `/index.md` a cualquier URL de docs. Ej: `https://documentation.expo.dev/develop/development-builds/create-a-build/index.md`
- **Índice general**: `https://documentation.expo.dev/llms.txt` (~94 kB, lista de todas las páginas)
- **SDK v54 completo**: `https://documentation.expo.dev/llms-sdk-v54.0.0.txt`
- **Docs completos**: `https://documentation.expo.dev/llms-full.txt` (~1.9 MB)

## Convenciones de código
- Archivos en kebab-case: `my-component.tsx`
- Componentes en PascalCase: `export function MyComponent()`
- Hooks empiezan con `use`: `use-auth.ts`
- No usar default exports en componentes (sí en pantallas de Expo Router)
- Preferir `function` sobre arrow functions para componentes
- Tipos de dominio van en `lib/types.ts`, no inline en hooks
- Funciones puras/helpers van en `lib/utils.ts`, no en hooks
- Lógica de signed URLs va en `lib/storage.ts`
- Colores solo se definen en `constants/theme.ts`, nunca hardcodeados
