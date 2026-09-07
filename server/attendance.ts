export const PUNCH_SEQUENCE = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA_FINAL",
] as const;

export type PunchType = (typeof PUNCH_SEQUENCE)[number];

export type AttendanceRecord = {
  type: PunchType;
  recordedAt: Date;
};

export type AttendanceSummary = {
  workedSeconds: number;
  intervalSeconds: number;
  isComplete: boolean;
  nextType: PunchType | null;
  status: "SEM_ENTRADA" | "TRABALHANDO" | "EM_INTERVALO" | "COMPLETA";
};

export const BUSINESS_TIMEZONE = "America/Sao_Paulo";

export function getBusinessDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function getNextPunchType(records: Pick<AttendanceRecord, "type">[]): PunchType | null {
  const hasValidSequence = records.every((record, index) => record.type === PUNCH_SEQUENCE[index]);
  if (!hasValidSequence) return null;
  return PUNCH_SEQUENCE[records.length] ?? null;
}

export function calculateAttendance(
  records: AttendanceRecord[],
  now = new Date(),
  includeOpenDuration = true,
): AttendanceSummary {
  const byType = new Map(records.map(record => [record.type, record.recordedAt]));
  const entry = byType.get("ENTRADA");
  const intervalOut = byType.get("SAIDA_INTERVALO");
  const intervalReturn = byType.get("RETORNO_INTERVALO");
  const finalOut = byType.get("SAIDA_FINAL");
  const secondsBetween = (from?: Date, to?: Date) =>
    from && to ? Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000)) : 0;

  let workedSeconds = secondsBetween(entry, intervalOut) + secondsBetween(intervalReturn, finalOut);
  let intervalSeconds = secondsBetween(intervalOut, intervalReturn);

  if (includeOpenDuration) {
    if (entry && !intervalOut) workedSeconds += secondsBetween(entry, now);
    if (intervalOut && !intervalReturn) intervalSeconds += secondsBetween(intervalOut, now);
    if (intervalReturn && !finalOut) workedSeconds += secondsBetween(intervalReturn, now);
  }

  const nextType = getNextPunchType(records);
  const status = !entry
    ? "SEM_ENTRADA"
    : finalOut
      ? "COMPLETA"
      : intervalOut && !intervalReturn
        ? "EM_INTERVALO"
        : "TRABALHANDO";

  return { workedSeconds, intervalSeconds, isComplete: Boolean(finalOut), nextType, status };
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
