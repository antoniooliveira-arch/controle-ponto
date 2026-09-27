import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTime } from "@/lib/attendance";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CircleAlert, Loader2, RefreshCcw, ScrollText } from "lucide-react";
import { useState } from "react";

const ACTION_STYLE = {
  INSERT: { label: "Incluída", className: "text-emerald-800 bg-emerald-100" },
  UPDATE: { label: "Alterada", className: "text-amber-800 bg-amber-100" },
  DELETE: { label: "Removida", className: "text-rose-800 bg-rose-100" },
} as const;

const PUNCH_LABEL = {
  ENTRADA: "Entrada",
  SAIDA_INTERVALO: "Saída intervalo",
  RETORNO_INTERVALO: "Retorno intervalo",
  SAIDA_FINAL: "Saída final",
} as const;

function formatAuditInstant(value: Date | string | null): string {
  if (!value) return "—";
  return formatTime(new Date(value));
}

export function AuditoriaAjustes() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filters, setFilters] = useState<{ startDate?: string; endDate?: string }>({});

  const audit = trpc.admin.punchAudit.useQuery(
    { startDate: filters.startDate ?? null, endDate: filters.endDate ?? null, limit: 200 },
    { placeholderData: previous => previous },
  );

  const rows = audit.data ?? [];
  const truncated = rows.length >= 200;

  return (
    <section className="admin-page">
      <div className="admin-title-row">
        <div>
          <p className="tiny-label">Trilha de auditoria</p>
          <h2 className="editorial-title mt-3 text-5xl">AJUSTES DE PONTO</h2>
          <p className="mt-3 max-w-xl font-serif text-lg text-stone-600">
            Registro imutável de toda alteração administrativa de batidas, com
            autor, data, horário anterior e novo, e a justificativa informada.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => audit.refetch()}
          disabled={audit.isFetching}
          className="h-11 rounded-none border-stone-900/25 text-xs tracking-[0.12em]"
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${audit.isFetching ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>
      </div>

      <div className="report-filter mt-10">
        <div>
          <Label htmlFor="audit-start" className="tiny-label">
            Jornada a partir de
          </Label>
          <Input
            id="audit-start"
            type="date"
            value={startDate}
            onChange={event => setStartDate(event.target.value)}
            className="admin-input mt-2"
          />
        </div>
        <div>
          <Label htmlFor="audit-end" className="tiny-label">
            Jornada até
          </Label>
          <Input
            id="audit-end"
            type="date"
            value={endDate}
            onChange={event => setEndDate(event.target.value)}
            className="admin-input mt-2"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            onClick={() => setFilters({ startDate: startDate || undefined, endDate: endDate || undefined })}
            className="h-10 rounded-none bg-stone-950 text-xs tracking-[0.13em]"
          >
            Filtrar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setFilters({});
            }}
            className="h-10 rounded-none border-stone-900/25 text-xs"
          >
            Limpar
          </Button>
        </div>
      </div>

      <div className="admin-table-card mt-8 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Registrado em</th>
              <th>Servidor</th>
              <th>Jornada</th>
              <th>Batida</th>
              <th>Ação</th>
              <th>Antes</th>
              <th>Depois</th>
              <th>Justificativa</th>
              <th>Autor</th>
            </tr>
          </thead>
          <tbody>
            {audit.isLoading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : audit.isError ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <CircleAlert className="mx-auto h-6 w-6 text-amber-700" />
                  <p className="mt-3 text-sm text-stone-600">
                    Não foi possível consultar a auditoria.
                  </p>
                  <Button
                    variant="link"
                    onClick={() => audit.refetch()}
                    className="mt-2 text-xs"
                  >
                    Tentar novamente
                  </Button>
                </td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <ScrollText className="mx-auto h-6 w-6 text-stone-400" />
                  <p className="mt-3 text-sm text-stone-500">
                    Nenhum ajuste de batida registrado até o momento.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map(entry => {
                const style = ACTION_STYLE[entry.action];
                return (
                  <tr key={entry.id}>
                    <td>
                      {format(new Date(entry.createdAt), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                      <small>
                        {format(new Date(entry.createdAt), "HH:mm", { locale: ptBR })}
                      </small>
                    </td>
                    <td>
                      <strong>{entry.employeeName}</strong>
                      <small>{entry.registration ?? "—"}</small>
                    </td>
                    <td>{entry.businessDate}</td>
                    <td>{PUNCH_LABEL[entry.punchType]}</td>
                    <td>
                      <span className={`status-pill ${style.className}`}>
                        {style.label}
                      </span>
                    </td>
                    <td>{formatAuditInstant(entry.previousRecordedAt)}</td>
                    <td>{formatAuditInstant(entry.newRecordedAt)}</td>
                    <td>
                      <span className="block max-w-xs">{entry.reason}</span>
                      {entry.notes ? (
                        <small className="block max-w-xs">{entry.notes}</small>
                      ) : null}
                    </td>
                    <td>{entry.adjustedBy}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {truncated ? (
        <p className="mt-4 text-xs text-stone-500">
          Exibindo os 200 registros mais recentes. Refine o período para ver
          ajustes anteriores.
        </p>
      ) : null}
    </section>
  );
}
