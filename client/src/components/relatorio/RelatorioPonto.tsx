import { Button } from "@/components/ui/button";
import { Eye, FileDown, Loader2, Printer } from "lucide-react";
import { buildDayRows, daysInMonth, reportFileName, type DayRow } from "@/lib/report";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { generateReportPdf, type ReportPdfData } from "./GerarPDF";
import { GestaoFeriados } from "./GestaoFeriados";
import { PreviewRelatorio } from "./PreviewRelatorio";
import { SelecaoCooperado, type CooperadoOpcao } from "./SelecaoCooperado";
import { SeletorMes } from "./SeletorMes";

function startOfCurrentMonth() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function printReport(doc: import("jspdf").jsPDF) {
  doc.autoPrint();
  const url = doc.output("bloburl") as string | URL;
  const targetUrl = typeof url === "string" ? url : url.href;
  window.open(targetUrl, "_blank");
  toast.info("Abrindo o relatório para impressão…");
}

export function RelatorioPonto() {
  const employees = trpc.admin.employees.useQuery();
  const holidaysQuery = trpc.admin.holidays.useQuery();
  const utils = trpc.useUtils();

  const inicial = startOfCurrentMonth();
  const [cooperado, setCooperado] = useState<CooperadoOpcao | null>(null);
  const [month, setMonth] = useState(inicial.month);
  const [year, setYear] = useState(inicial.year);
  const [previewRequest, setPreviewRequest] = useState(false);

  const cooperadoId = cooperado?.id;
  const report = trpc.admin.monthlyReport.useQuery(
    { employeeId: cooperadoId ?? 0, month, year },
    { enabled: Boolean(previewRequest && cooperadoId) },
  );

  const selectedEmployee = useMemo(() => {
    if (!cooperado) return null;
    const row = employees.data?.find(item => item.id === cooperado.id);
    return row ?? null;
  }, [cooperado, employees.data]);

  const dayRows: DayRow[] = useMemo(() => {
    if (!report.data) return [];
    return buildDayRows(report.data.year, report.data.month, report.data.days, holidaysQuery.data);
  }, [report.data, holidaysQuery.data]);

  const holidaysCount = useMemo(
    () => dayRows.filter(day => day.marked).length,
    [dayRows],
  );

  const logReport = trpc.admin.logReport.useMutation({
    onSuccess: () => utils.admin.reportLogs.invalidate(),
  });

  const buildPdfData = (): ReportPdfData | null => {
    if (!report.data || !selectedEmployee) return null;
    return {
      employee: {
        fullName: selectedEmployee.fullName,
        registration: selectedEmployee.registration,
        funcao: selectedEmployee.funcao ?? "",
        cargo: selectedEmployee.cargo ?? "",
        lotacaoLocal: selectedEmployee.lotacaoLocal ?? selectedEmployee.sectorName ?? "",
        cargaHoraria: selectedEmployee.cargaHoraria ?? "8h",
      },
      month: report.data.month,
      year: report.data.year,
      days: dayRows,
    };
  };

  const generatePdf = () => {
    const data = buildPdfData();
    if (!data) return null;
    const doc = generateReportPdf(data);
    return { doc, data };
  };

  const downloadPdf = () => {
    const generated = generatePdf();
    if (!generated) {
      toast.error("Selecione o cooperado e visualize o relatório antes de gerar o PDF.");
      return;
    }
    const fileName = reportFileName(selectedEmployee!.fullName, year, month);
    generated.doc.save(fileName);
    logReport.mutate({
      employeeId: selectedEmployee!.id,
      month,
      year,
      fileName,
    });
    toast.success("Folha mensal gerada em PDF.");
  };

  const printReportClick = () => {
    const generated = generatePdf();
    if (!generated) {
      toast.error("Selecione o cooperado e visualize o relatório antes de imprimir.");
      return;
    }
    printReport(generated.doc);
    logReport.mutate({
      employeeId: selectedEmployee!.id,
      month,
      year,
      fileName: reportFileName(selectedEmployee!.fullName, year, month),
    });
  };

  const advancePreview = () => {
    if (!cooperado) {
      toast.error("Selecione o cooperado antes de visualizar o relatório.");
      return;
    }
    setPreviewRequest(true);
  };

  const clear = () => {
    setCooperado(null);
    setPreviewRequest(false);
    setMonth(inicial.month);
    setYear(inicial.year);
  };

  const daysCount = daysInMonth(year, month);

  return (
    <section className="admin-page">
      <div className="admin-title-row">
        <div>
          <p className="tiny-label">Emissão de folha mensal</p>
          <h2 className="editorial-title mt-3 text-5xl">RELATÓRIO DE PONTO</h2>
          <p className="mt-3 max-w-xl font-serif text-lg text-stone-600">
            Selecione o cooperado e o mês para montar a Folha Diária de Controle com os registros existentes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clear} className="h-11 rounded-none border-stone-900/25 text-xs tracking-[0.12em]">
            Limpar
          </Button>
          <Button
            onClick={advancePreview}
            disabled={!cooperado || report.isLoading}
            className="h-11 rounded-none bg-stone-950 text-xs tracking-[0.14em]"
          >
            <Eye className="mr-2 h-4 w-4" />
            Visualizar relatório
          </Button>
        </div>
      </div>

      <div className="report-filter mt-10">
        <div className="min-w-[260px] flex-1">
          <SelecaoCooperado
            cooperados={(employees.data ?? []).map(employee => ({
              id: employee.id,
              fullName: employee.fullName,
              registration: employee.registration,
            }))}
            value={cooperado}
            onChange={value => {
              setCooperado(value);
              setPreviewRequest(false);
            }}
          />
        </div>
        <div className="min-w-[300px] flex-1">
          <SeletorMes
            month={month}
            year={year}
            onChange={(nextMonth, nextYear) => {
              setMonth(nextMonth);
              setYear(nextYear);
              setPreviewRequest(false);
            }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="paper-card p-4">
          <p className="tiny-label">Cooperado</p>
          <p className="mt-2 font-serif text-lg">{selectedEmployee?.fullName ?? "—"}</p>
        </div>
        <div className="paper-card p-4">
          <p className="tiny-label">Matrícula</p>
          <p className="mt-2 font-serif text-lg">{selectedEmployee?.registration ?? "—"}</p>
        </div>
        <div className="paper-card p-4">
          <p className="tiny-label">Lotação / local</p>
          <p className="mt-2 font-serif text-lg">
            {selectedEmployee?.lotacaoLocal ?? selectedEmployee?.sectorName ?? "—"}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <GestaoFeriados />
      </div>

      {previewRequest && report.isLoading && (
        <div className="mt-10 grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="mt-3 text-sm text-stone-600">Montando a folha de {daysCount} dias…</p>
        </div>
      )}

      {previewRequest && report.isError && (
        <div className="paper-card mt-10 p-8 text-center">
          <p className="text-sm text-stone-600">Não foi possível montar o relatório solicitado.</p>
          <Button variant="link" onClick={() => report.refetch()} className="mt-2 text-xs">
            Tentar novamente
          </Button>
        </div>
      )}

      {previewRequest && report.isSuccess && selectedEmployee && (
        <>
          <div className="mt-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="tiny-label">
                Folha de {daysCount} dias · {holidaysCount} {holidaysCount === 1 ? "feriado/fim de semana" : "feriados/fins de semana"}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={downloadPdf}
                  disabled={logReport.isPending}
                  className="h-10 rounded-none bg-[#1d4a2f] text-xs tracking-[0.12em]"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Gerar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={printReportClick}
                  disabled={logReport.isPending}
                  className="h-10 rounded-none border-stone-900/25 text-xs tracking-[0.12em]"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
            <PreviewRelatorio
              employee={{
                fullName: selectedEmployee.fullName,
                registration: selectedEmployee.registration,
                funcao: selectedEmployee.funcao ?? "",
                cargo: selectedEmployee.cargo ?? "",
                lotacaoLocal: selectedEmployee.lotacaoLocal ?? selectedEmployee.sectorName ?? "",
                cargaHoraria: selectedEmployee.cargaHoraria ?? "8h",
              }}
              month={month}
              year={year}
              days={dayRows}
            />
          </div>
        </>
      )}

      {!previewRequest && (
        <div className="paper-card mt-10 p-10 text-center">
          <Eye className="mx-auto h-6 w-6 text-stone-400" />
          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Selecione o cooperado e o mês, depois clique em <strong>Visualizar relatório</strong> para montar a folha.
          </p>
        </div>
      )}
    </section>
  );
}