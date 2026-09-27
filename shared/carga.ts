export const CARGA_SEMANAL_PADRAO = 40;

export const CARGA_SEMANAL_OPCOES = [10, 15, 20, 30, 40] as const;

export const DIAS_UTEIS_SEMANA = 5;

export const TOLERANCIA_SEGUNDOS = 10 * 60;

export type CargaSituation =
  | "DENTRO_DA_CARGA"
  | "TOLERANCIA"
  | "EXCEDENTE"
  | "DEFICITARIO"
  | "SEM_CARGA_PREVISTA"
  | "EM_ANDAMENTO";

export type CargaEvaluation = {
  expectedSeconds: number;
  workedSeconds: number;
  deltaSeconds: number;
  situation: CargaSituation;
};

const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SUNDAY = 0;
const SATURDAY = 6;

const pad = (value: number) => String(value).padStart(2, "0");

export function parseBusinessDate(businessDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(businessDate);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toBusinessDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function isWeekendDate(businessDate: string): boolean {
  const date = parseBusinessDate(businessDate);
  if (!date) return false;
  const weekday = date.getUTCDay();
  return weekday === SUNDAY || weekday === SATURDAY;
}

export function cargaMinutosDiarios(
  cargaSemanal: number | null | undefined,
  businessDate: string,
): number {
  const semanal = normaliseCargaSemanal(cargaSemanal);
  if (isWeekendDate(businessDate)) return 0;
  return Math.round((semanal * MINUTES_PER_HOUR) / DIAS_UTEIS_SEMANA);
}

export function cargaSegundosDiarios(
  cargaSemanal: number | null | undefined,
  businessDate: string,
): number {
  return cargaMinutosDiarios(cargaSemanal, businessDate) * SECONDS_PER_MINUTE;
}

export function evaluateCarga(input: {
  workedSeconds: number;
  expectedSeconds: number;
  isComplete: boolean;
  toleranceSeconds?: number;
}): CargaEvaluation {
  const tolerance = Math.max(0, input.toleranceSeconds ?? TOLERANCIA_SEGUNDOS);
  const expected = Math.max(0, input.expectedSeconds);
  const worked = Math.max(0, input.workedSeconds);
  const deltaSeconds = worked - expected;

  const situation: CargaSituation = !input.isComplete
    ? "EM_ANDAMENTO"
    : expected === 0
      ? "SEM_CARGA_PREVISTA"
      : deltaSeconds === 0
        ? "DENTRO_DA_CARGA"
        : Math.abs(deltaSeconds) <= tolerance
          ? "TOLERANCIA"
          : deltaSeconds > 0
            ? "EXCEDENTE"
            : "DEFICITARIO";

  return { expectedSeconds: expected, workedSeconds: worked, deltaSeconds, situation };
}

export function getWeekBounds(businessDate: string): { startDate: string; endDate: string } | null {
  const date = parseBusinessDate(businessDate);
  if (!date) return null;
  const offsetFromMonday = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date.getTime() - offsetFromMonday * DAY_IN_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_IN_MS);
  return { startDate: toBusinessDate(monday), endDate: toBusinessDate(sunday) };
}

export function formatSignedDuration(totalSeconds: number): string {
  const sign = totalSeconds > 0 ? "+" : totalSeconds < 0 ? "-" : "";
  const absolute = Math.abs(Math.floor(totalSeconds));
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);
  return `${sign}${pad(hours)}:${pad(minutes)}`;
}

export function formatDuration(totalSeconds: number): string {
  const absolute = Math.abs(Math.floor(totalSeconds));
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);
  return `${pad(hours)}:${pad(minutes)}`;
}

export type CargaTotals = {
  totalWorkedSeconds: number;
  totalExpectedSeconds: number;
  netDeltaSeconds: number;
  diasExcesso: number;
  diasFalta: number;
  diasRegulares: number;
  segundosExcesso: number;
  segundosFalta: number;
};

export function calculateCargaTotals(items: { carga?: CargaEvaluation | null }[]): CargaTotals {
  let totalWorkedSeconds = 0;
  let totalExpectedSeconds = 0;
  let netDeltaSeconds = 0;
  let diasExcesso = 0;
  let diasFalta = 0;
  let diasRegulares = 0;
  let segundosExcesso = 0;
  let segundosFalta = 0;

  for (const item of items) {
    const c = item.carga;
    if (!c) continue;
    if (c.situation === "EM_ANDAMENTO") continue;

    if (c.situation === "SEM_CARGA_PREVISTA") {
      if (c.workedSeconds > 0) {
        totalWorkedSeconds += c.workedSeconds;
        netDeltaSeconds += c.deltaSeconds;
      }
      continue;
    }

    totalWorkedSeconds += c.workedSeconds;
    totalExpectedSeconds += c.expectedSeconds;
    netDeltaSeconds += c.deltaSeconds;

    if (c.situation === "EXCEDENTE") {
      diasExcesso++;
      segundosExcesso += Math.max(0, c.deltaSeconds);
    } else if (c.situation === "DEFICITARIO") {
      diasFalta++;
      segundosFalta += Math.max(0, -c.deltaSeconds);
    } else if (c.situation === "DENTRO_DA_CARGA" || c.situation === "TOLERANCIA") {
      diasRegulares++;
    }
  }

  return {
    totalWorkedSeconds,
    totalExpectedSeconds,
    netDeltaSeconds,
    diasExcesso,
    diasFalta,
    diasRegulares,
    segundosExcesso,
    segundosFalta,
  };
}

export function formatWeeklyLoad(cargaSemanal: number | null | undefined): string {
  return `${normaliseCargaSemanal(cargaSemanal)}h semanais`;
}

export function normaliseCargaSemanal(cargaSemanal: number | null | undefined): number {
  return typeof cargaSemanal === "number" && Number.isFinite(cargaSemanal) && cargaSemanal > 0
    ? Math.round(cargaSemanal)
    : CARGA_SEMANAL_PADRAO;
}
