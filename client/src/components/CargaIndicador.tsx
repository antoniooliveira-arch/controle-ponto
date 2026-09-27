import { formatSignedDuration, type CargaEvaluation, type CargaSituation } from "@shared/carga";

export const CARGA_STYLE: Record<
  CargaSituation,
  { label: string; className: string }
> = {
  DENTRO_DA_CARGA: { label: "Na carga", className: "text-emerald-800 bg-emerald-100" },
  TOLERANCIA: { label: "Dentro da tolerância", className: "text-stone-700 bg-stone-200" },
  EXCEDENTE: { label: "Excedente", className: "text-amber-800 bg-amber-100" },
  DEFICITARIO: { label: "Falta", className: "text-rose-800 bg-rose-100" },
  SEM_CARGA_PREVISTA: { label: "Fora da carga", className: "text-sky-800 bg-sky-100" },
  EM_ANDAMENTO: { label: "Em andamento", className: "text-stone-600 bg-stone-100" },
};

export const CARGA_SITUACAO_CURTA: Record<CargaSituation, string> = {
  DENTRO_DA_CARGA: "=",
  TOLERANCIA: "~",
  EXCEDENTE: "+",
  DEFICITARIO: "-",
  SEM_CARGA_PREVISTA: "•",
  EM_ANDAMENTO: "…",
};

export function CargaBadge({
  carga,
  showDelta = true,
}: {
  carga: CargaEvaluation | null | undefined;
  showDelta?: boolean;
}) {
  if (!carga) return null;
  const style = CARGA_STYLE[carga.situation];
  return (
    <span className={`status-pill ${style.className}`}>
      {style.label}
      {showDelta && carga.situation !== "EM_ANDAMENTO"
        ? ` ${formatSignedDuration(carga.deltaSeconds)}`
        : ""}
    </span>
  );
}
