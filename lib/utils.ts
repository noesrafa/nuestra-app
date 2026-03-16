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
  "¿Qué hicieron hoy, amor?",
  "Otro día más juntitos",
  "No dejen pasar este momento",
  "¿Cómo les fue hoy?",
  "Este recuerdo es de ustedes",
];

const PROMPTS_WEEKEND = [
  "¿A dónde se escaparon hoy?",
  "Finde juntos, ¡a disfrutar!",
  "¿Qué aventura les tocó hoy?",
  "Un finde más para recordar",
];

const PROMPTS_TODAY = [
  "¿Qué andan haciendo, tortolitos?",
  "¡Selfie juntos, ya!",
  "Hoy es buen día para una fotito",
];

const PROMPTS_PAST = [
  "¿Qué hicieron este día?",
  "Este recuerdo merece una foto",
  "¿Cómo les fue juntos ese día?",
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
