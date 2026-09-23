import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SelecaoCooperado,
  type CooperadoOpcao,
} from "@/components/relatorio/SelecaoCooperado";
import {
  businessDateNow,
  formatDuration,
  formatTimeOnly,
  zonedTimeToUtc,
} from "@/lib/attendance";
import { trpc } from "@/lib/trpc";
import {
  CalendarDays,
  CircleAlert,
  Loader2,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

const PUNCH_STEPS = [
  { type: "ENTRADA", label: "Entrada", mark: "01" },
  { type: "SAIDA_INTERVALO", label: "Saída para intervalo", mark: "02" },
  { type: "RETORNO_INTERVALO", label: "Retorno do intervalo", mark: "03" },
  { type: "SAIDA_FINAL", label: "Saída final", mark: "04" },
] as const;

type PunchType = (typeof PUNCH_STEPS)[number]["type"];
type TimeMap = Record<PunchType, string>;

const EMPTY_TIMES: TimeMap = {
  ENTRADA: "",
  SAIDA_INTERVALO: "",
  RETORNO_INTERVALO: "",
  SAIDA_FINAL: "",
};

function isPunchType(value: string): value is PunchType {
  return PUNCH_STEPS.some(step => step.type === value);
}

export function AjustesPonto() {
  const today = useMemo(businessDateNow, []);
  const utils = trpc.useUtils();
  const employees = trpc.admin.employees.useQuery();
  const [cooperado, setCooperado] = useState<CooperadoOpcao | null>(null);
  const [date, setDate] = useState(today);
  const [times, setTimes] = useState<TimeMap>(EMPTY_TIMES);

  const selectedId = cooperado?.id ?? null;
  const dayDetail = trpc.admin.dayDetail.useQuery(
    { employeeId: selectedId ?? 0, businessDate: date },
    { enabled: Boolean(selectedId) }
  );

  const serverTimes = useMemo<TimeMap>(() => {
    const next = { ...EMPTY_TIMES };
    dayDetail.data?.records.forEach(record => {
      if (isPunchType(record.type))
        next[record.type] = formatTimeOnly(record.recordedAt);
    });
    return next;
  }, [dayDetail.data]);

  useEffect(() => {
    setTimes(serverTimes);
  }, [serverTimes]);

  const dirty = PUNCH_STEPS.some(
    step => (times[step.type] ?? "") !== serverTimes[step.type]
  );
  const hasData = Boolean(dayDetail.data?.records.length);

  const summary = useMemo(() => {
    const values = PUNCH_STEPS.map(step => times[step.type]);
    if (values.some(value => !value)) return null;
    const [entry, intervalOut, intervalReturn, finalOut] = PUNCH_STEPS.map(
      step => zonedTimeToUtc(date, times[step.type]).getTime()
    );
    return {
      workedSeconds: Math.max(
        0,
        (intervalOut - entry + (finalOut - intervalReturn)) / 1000
      ),
      intervalSeconds: Math.max(0, (intervalReturn - intervalOut) / 1000),
    };
  }, [times, date]);

  const save = trpc.admin.saveDayAdjustments.useMutation({
    onSuccess: async () => {
      toast.success("Ajustes salvos para a jornada selecionada.");
      await Promise.all([dayDetail.refetch(), utils.admin.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) return;
    const records = PUNCH_STEPS.flatMap(step => {
      const time = times[step.type];
      if (!time) return [];
      const existing = dayDetail.data?.records.find(
        record => record.type === step.type
      );
      return [
        {
          type: step.type,
          recordId: existing?.id ?? null,
          recordedAt: zonedTimeToUtc(date, time).toISOString(),
        },
      ];
    });
    if (!records.length) {
      toast.error("Informe ao menos um horário de batida para salvar.");
      return;
    }
    save.mutate({ employeeId: selectedId, businessDate: date, records });
  };

  return (
    <section className="admin-page">
      <div className="admin-title-row">
        <div>
          <p className="tiny-label">Correção de registros</p>
          <h2 className="editorial-title mt-3 text-5xl">Ajustes de ponto</h2>
          <p className="mt-3 max-w-xl font-serif text-lg text-stone-600">
            Altere horários, inclua ou remova batidas de um servidor em um dia
            específico para corrigir o ponto.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => dayDetail.refetch()}
          disabled={!selectedId || dayDetail.isFetching}
          className="rounded-none border-stone-900/25 text-xs tracking-[0.13em]"
        >
          <RefreshCw
            className={`mr-2 h-3.5 w-3.5 ${dayDetail.isFetching ? "animate-spin" : ""}`}
          />
          Recarregar
        </Button>
      </div>

      <div className="report-filter mt-10">
        <div className="min-w-[220px]">
          <SelecaoCooperado
            cooperados={(employees.data ?? []).map(employee => ({
              id: employee.id,
              fullName: employee.fullName,
              registration: employee.registration,
            }))}
            value={cooperado}
            onChange={value => {
              setCooperado(value);
            }}
          />
        </div>
        <div>
          <Label className="tiny-label">Data da jornada</Label>
          <Input
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
            className="admin-input mt-2"
          />
        </div>
        <div className="max-w-md">
          <p className="tiny-label">Orientações</p>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Deixe o horário vazio para excluir a batida daquele tipo. Registros
            incluídos manualmente ficam sem coordenadas de localização.
          </p>
        </div>
      </div>

      {!cooperado ? (
        <div className="paper-card mt-10 p-10 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-stone-400" />
          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Selecione um servidor e a data para ajustar as batidas da jornada.
          </p>
        </div>
      ) : dayDetail.isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          <p className="mt-3 text-sm text-stone-600">
            Consultando os registros …
          </p>
        </div>
      ) : dayDetail.isError ? (
        <div className="paper-card mt-10 p-8 text-center">
          <CircleAlert className="mx-auto h-6 w-6 text-amber-700" />
          <p className="mt-3 text-sm text-stone-600">
            Não foi possível carregar os registros deste servidor.
          </p>
          <Button
            variant="link"
            onClick={() => dayDetail.refetch()}
            className="mt-2 text-xs"
          >
            Tentar novamente
          </Button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="mt-10 border border-stone-900/15 bg-[#f8f3e9]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-900/10 px-5 py-4">
            <div>
              <p className="tiny-label">Jornada de {formatDateLabel(date)}</p>
              <p className="mt-1 text-sm font-medium">
                {cooperado.fullName} · Matrícula {cooperado.registration}
              </p>
            </div>
            <span
              className={`status-pill ${hasData ? "text-emerald-800 bg-emerald-100" : "text-stone-600 bg-stone-200"}`}
            >
              {hasData ? "Registros existentes" : "Sem registros"}
            </span>
          </div>
          <div className="px-5 py-2">
            {PUNCH_STEPS.map(step => {
              const hasRecord = dayDetail.data?.records.some(
                record => record.type === step.type
              );
              return (
                <div
                  key={step.type}
                  className="flex items-center gap-3 border-b border-stone-900/10 py-3 last:border-0"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center border border-stone-900/30 font-serif text-xs">
                    {step.mark}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm">{step.label}</strong>
                    <span className="mt-0.5 block text-[11px] text-stone-500">
                      {hasRecord
                        ? "Batida existente — o horário será substituído"
                        : "Nenhuma batida registrada — será incluída"}
                    </span>
                  </div>
                  <Input
                    type="time"
                    value={times[step.type]}
                    onChange={event =>
                      setTimes(previous => ({
                        ...previous,
                        [step.type]: event.target.value,
                      }))
                    }
                    className="admin-input h-10 w-36"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!times[step.type]}
                    onClick={() =>
                      setTimes(previous => ({ ...previous, [step.type]: "" }))
                    }
                    title={`Remover ${step.label.toLowerCase()}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-900/10 px-5 py-4">
            <p className="text-sm text-stone-700">
              {summary ? (
                <>
                  Trabalhado{" "}
                  <strong className="font-serif">
                    {formatDuration(summary.workedSeconds)}
                  </strong>{" "}
                  · Intervalo{" "}
                  <strong className="font-serif">
                    {formatDuration(summary.intervalSeconds)}
                  </strong>
                </>
              ) : (
                "Informe os horários para ver o total apurado."
              )}
            </p>
            <Button
              type="submit"
              disabled={!dirty || !selectedId || save.isPending}
              className="h-10 rounded-none bg-stone-950 text-xs tracking-[0.14em]"
            >
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar ajustes
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function formatDateLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
