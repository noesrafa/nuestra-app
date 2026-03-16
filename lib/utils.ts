export function formatDisplayDate(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function formatDate(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

const PROMPTS_WEEKDAY = [
  "¿Qué hicieron hoy juntos?",
  "Un recuerdo más juntos",
  "Capturen este momento",
  "¿Cómo fue su día?",
  "Guarden este recuerdo",
];

const PROMPTS_WEEKEND = [
  "¿A dónde salieron hoy?",
  "Fin de semana juntos",
  "¿Qué aventura vivieron hoy?",
  "Un momento especial juntos",
];

const PROMPTS_TODAY = [
  "¿Qué están haciendo hoy?",
  "Capturen el momento",
  "Hoy es un buen día para una foto juntos",
];

const PROMPTS_PAST = [
  "¿Qué hicieron este día?",
  "Un recuerdo por guardar",
  "¿Cómo fue este día juntos?",
];

export function getPhotoPrompt(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const isPast = date < today && !isToday;
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Use date as seed for deterministic but varied selection
  const seed = date.getDate() * 31 + date.getMonth() * 7;

  if (isToday) return PROMPTS_TODAY[seed % PROMPTS_TODAY.length];
  if (isPast) return PROMPTS_PAST[seed % PROMPTS_PAST.length];
  if (isWeekend) return PROMPTS_WEEKEND[seed % PROMPTS_WEEKEND.length];
  return PROMPTS_WEEKDAY[seed % PROMPTS_WEEKDAY.length];
}
