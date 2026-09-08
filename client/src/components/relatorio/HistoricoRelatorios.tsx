import { Button } from "@/components/ui/button";
import { FileDown, History, Loader2, RefreshCcw } from "lucide-react";
import { MONTHS, buildDayRows, reportFileName } from "@/lib/report";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { generateReportPdf } from "./GerarPDF";

export function HistoricoRelatorios() {
  const logs = trpc.admin.reportLogs.useQuery();
  const utils = trpc.useUtils();
  const [regenerating, setRegenerating] = useState<number | null>(null);

  const regenerar = async (log: NonNullable<typeof logs.data>[number]) => {
    setRegenerating(log.id);
    try {
      const report = await utils.client.admin.monthlyReport.query({
        employeeId: log.employeeId,
        month: log.month,
        year: log.year,
      });
      if (!report) {
        toast.error("Cooperado indisponível para reemitir o relatório.");
        return;
      }
      const holidays = await utils.client.admin.holidays.query();
      const days = buildDayRows(report.year, report.month, report.days, holidays);
      const doc = generateReportPdf({
        employee: {
          fullName: report.employee.fullName,
          registration: report.employee.registration,
          funcao: report.employee.funcao,
          cargo: report.employee.cargo,
          lotacaoLocal: report.employee.lotacaoLocal,
          cargaHoraria: report.employee.cargaHoraria,
        },
        month: report.month,
        year: report.year,
        days,
      });
      const fileName = reportFileName(report.employee.fullName, report.year, report.month);
      doc.save(fileName);
      toast.success("Relatório reemitido em PDF.");
    } catch {
      toast.error("Não foi possível reemitir o relatório.");
    } finally {
      setRegenerating(null);
    }
  };

  return (
    <section className="admin-page">
      <div className="admin-title-row">
        <div>
          <p className="tiny-label">Histórico de emissões</p>
          <h2 className="editorial-title mt-3 text-5xl">RELATÓRIOS EMITIDOS</h2>
          <p className="mt-3 max-w-xl font-serif text-lg text-stone-600">
            Consulte as folhas mensais já emitidas e reimprima ou reenvie em PDF.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => logs.refetch()}
          disabled={logs.isFetching}
          className="h-11 rounded-none border-stone-900/25 text-xs tracking-[0.12em]"
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${logs.isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="admin-table-card mt-10 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Cooperado</th>
              <th>Matrícula</th>
              <th>Lotação</th>
              <th>Mês</th>
              <th>Ano</th>
              <th>Data de emissão</th>
              <th>Emitido por</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {logs.isLoading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : logs.isError ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <p className="text-stone-600">Não foi possível consultar o histórico.</p>
                  <Button variant="link" onClick={() => logs.refetch()} className="mt-2 text-xs">
                    Tentar novamente
                  </Button>
                </td>
              </tr>
            ) : !logs.data?.length ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <History className="mx-auto h-6 w-6 text-stone-400" />
                  <p className="mt-3 text-sm text-stone-500">Nenhuma emissão registrada até o momento.</p>
                </td>
              </tr>
            ) : (
              logs.data.map(log => (
                <tr key={log.id}>
                  <td>
                    <strong>{log.employeeName ?? "Cooperado indisponível"}</strong>
                  </td>
                  <td>{log.registration ?? "—"}</td>
                  <td>{log.lotacaoLocal ?? "—"}</td>
                  <td>{MONTHS[log.month - 1]}</td>
                  <td>{log.year}</td>
                  <td>{format(new Date(log.issuedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</td>
                  <td>{log.issuedBy ?? "Administrador"}</td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => regenerar(log)}
                      disabled={regenerating === log.id}
                      className="rounded-none border-stone-900/25 text-[11px]"
                    >
                      {regenerating === log.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                      Baixar / reemitir
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}