import { MONTHS, type DayRow } from "@/lib/report";
import { cn } from "@/lib/utils";
import { TabelaPonto } from "./TabelaPonto";

export type PreviewEmployee = {
  fullName: string;
  registration: string;
  funcao: string;
  cargo: string;
  lotacaoLocal: string;
  cargaHoraria: string;
};

export function PreviewRelatorio({
  employee,
  month,
  year,
  days,
}: {
  employee: PreviewEmployee;
  month: number;
  year: number;
  days: DayRow[];
}) {
  const Field = ({ label, value, right = false }: { label: string; value: string; right?: boolean }) => (
    <p className={cn("flex items-baseline gap-1 text-[11px] leading-snug", right && "justify-end text-right")}>
      <span className="font-semibold text-stone-700">{label} </span>
      <span className="font-medium text-stone-900">{value}</span>
    </p>
  );

  return (
    <div className="paper-card p-4 sm:p-6">
      <div className="border border-stone-800/60 bg-white p-4">
        <header className="text-center">
          <p className="font-serif text-2xl font-bold tracking-wide text-[#1d4a2f]">EDUCAÇÃO</p>
          <p className="mt-1 font-serif text-lg font-semibold tracking-wide text-stone-900">
            FOLHA DIÁRIA DE CONTROLE
          </p>
          <div className="mx-auto mt-3 h-px max-w-xl bg-stone-300" />
        </header>

        <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
          <Field label="COOPERADO (a):" value={employee.fullName} />
          <Field label="MATRÍCULA:" value={employee.registration} right />
          <Field label="FUNÇÃO:" value={employee.funcao} />
          <Field label="CARGO:" value={employee.cargo} right />
          <Field label="LOTAÇÃO/LOCAL:" value={`${employee.lotacaoLocal} · ${employee.cargaHoraria}`} />
          <Field label="PERÍODO:" value={`${MONTHS[month - 1]} - ${year}`} right />
        </div>

        <div className="mt-3">
          <TabelaPonto year={year} month={month} days={days} />
        </div>
      </div>
    </div>
  );
}