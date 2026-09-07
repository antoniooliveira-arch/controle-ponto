export const PUNCH_LABELS = {
  ENTRADA: "Registrar entrada",
  SAIDA_INTERVALO: "Registrar saída para intervalo",
  RETORNO_INTERVALO: "Registrar retorno do intervalo",
  SAIDA_FINAL: "Registrar saída final",
} as const;

export const PUNCH_SHORT_LABELS = {
  ENTRADA: "Entrada",
  SAIDA_INTERVALO: "Saída para intervalo",
  RETORNO_INTERVALO: "Retorno do intervalo",
  SAIDA_FINAL: "Saída final",
} as const;

export const PUNCH_MARKS = {
  ENTRADA: "01",
  SAIDA_INTERVALO: "02",
  RETORNO_INTERVALO: "03",
  SAIDA_FINAL: "04",
} as const;

export type PunchType = keyof typeof PUNCH_LABELS;

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds ?? 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Cuiaba",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Cuiaba",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function businessDateNow(): string {
  const pieces = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Cuiaba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => pieces.find(piece => piece.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function recordTime<T extends { type: string; recordedAt: Date | string }>(records: T[], type: string) {
  return records.find(record => record.type === type)?.recordedAt;
}
