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

export const BUSINESS_TIME_ZONE = "America/Cuiaba";

export function formatTimeOnly(value: Date | string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: BUSINESS_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

export function zonedTimeToUtc(businessDate: string, time: string, timeZone = BUSINESS_TIME_ZONE): Date {
  const [year, month, day] = businessDate.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let result = target;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(result));
    const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value ?? "0");
    const shownAsUtc = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute"), pick("second"));
    result = target - (shownAsUtc - result);
  }
  return new Date(result);
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

export type GeoPosition = { latitude: number; longitude: number };

export function recordCoordinates<T extends { type: string; latitude?: number | null; longitude?: number | null }>(records: T[], type: string): string | null {
  const record = records.find(item => item.type === type);
  if (record && record.latitude != null && record.longitude != null) {
    return `${record.latitude.toFixed(6)}, ${record.longitude.toFixed(6)}`;
  }
  return null;
}

export function requestGeolocation(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Este dispositivo não permite acessar a localização. Use um navegador como Chrome e tente novamente."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      error => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Para registrar a batida é obrigatório autorizar o acesso à localização. Habilite a permissão no navegador e tente novamente."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Não foi possível obter a localização. Verifique se o GPS está ativo e tente novamente."));
            break;
          default:
            reject(new Error("A obtenção da localização expirou. Verifique o sinal e tente novamente."));
        }
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });
}
