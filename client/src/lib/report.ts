export const MONTHS = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
] as const;

export const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;

export type PointRecord = { type: string; recordedAt: Date };

export type DayRow = {
  day: number;
  weekday: string;
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
  isHoliday: boolean;
  holidayDescription: string;
  marked: boolean;
};

export type ReportDay = { day: number; records: PointRecord[] };

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function weekdayName(year: number, month: number, day: number): string {
  const dow = new Date(year, month - 1, day).getDay();
  return WEEKDAYS[dow];
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}

export function formatReportHour(value: Date | string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Cuiaba",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export type HolidayEntry = { date: string; description?: string | null };

export function buildDayRows(
  year: number,
  month: number,
  days: ReportDay[],
  holidays?: HolidayEntry[],
): DayRow[] {
  const byDay = new Map<number, PointRecord[]>();
  (days ?? []).forEach(entry => byDay.set(entry.day, entry.records));
  const holidaysByDate = new Map((holidays ?? []).map(h => [h.date, h.description ?? "FERIADO"]));
  const count = daysInMonth(year, month);
  const rows: DayRow[] = [];
  for (let day = 1; day <= count; day++) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekend = isWeekend(year, month, day);
    const holidayDesc = holidaysByDate.get(dateKey);
    const isHoliday = weekend || Boolean(holidayDesc);
    const records = byDay.get(day) ?? [];
    const time = (type: string) => formatReportHour(records.find(r => r.type === type)?.recordedAt);
    rows.push({
      day,
      weekday: weekdayName(year, month, day),
      entrada1: time("ENTRADA"),
      saida1: time("SAIDA_INTERVALO"),
      entrada2: time("RETORNO_INTERVALO"),
      saida2: time("SAIDA_FINAL"),
      isHoliday,
      holidayDescription: holidayDesc ?? (weekend ? "Fim de semana" : ""),
      marked: Boolean(holidayDesc),
    });
  }
  return rows;
}

export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function reportFileName(employeeName: string, year: number, month: number): string {
  const slug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `folha-ponto-${slug(employeeName)}-${year}-${String(month).padStart(2, "0")}.pdf`;
}