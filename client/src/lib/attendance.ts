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

export type GeoPosition = { latitude: number; longitude: number };

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
