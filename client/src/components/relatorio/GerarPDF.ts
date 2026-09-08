import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MONTHS, type DayRow } from "@/lib/report";

export type ReportEmployeeInfo = {
  fullName: string;
  registration: string;
  funcao: string;
  cargo: string;
  lotacaoLocal: string;
  cargaHoraria: string;
};

export type ReportPdfData = {
  employee: ReportEmployeeInfo;
  month: number;
  year: number;
  days: DayRow[];
};

const PAGE_WIDTH = 297;
const MARGIN = 13;
const TABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLUMN_WIDTHS = [15, 16, 22, 52, 22, 22, 22, 52, 48];
const COLUMN_TITLES = ["DIA", "SEM", "ENTRADA", "ASSINATURA", "SAÍDA", "ENTRADA", "SAÍDA", "ASSINATURA", "RESP/DIRETO"];
const COORDINATE_COLUMNS: Record<number, "entrada1Coord" | "saida1Coord" | "entrada2Coord" | "saida2Coord"> = {
  2: "entrada1Coord",
  4: "saida1Coord",
  5: "entrada2Coord",
  6: "saida2Coord",
};

function drawLabeledValue(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  opts: { fontSize?: number; labelWidth?: number; color?: [number, number, number] } = {},
) {
  const fontSize = opts.fontSize ?? 9.5;
  const labelWidth = opts.labelWidth ?? 27;
  const color = opts.color ?? [30, 30, 28];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(35, 35, 32);
  doc.text(value, x + labelWidth, y);
}

function drawInfoRow(
  doc: jsPDF,
  y: number,
  left: { label: string; value: string },
  right: { label: string; value: string },
) {
  drawLabeledValue(doc, MARGIN, y, left.label, left.value);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(right.label, PAGE_WIDTH / 2, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(35, 35, 32);
  doc.text(right.value, PAGE_WIDTH / 2 + 27, y);
}

export function generateReportPdf(data: ReportPdfData): jsPDF {
  const { employee, month, year, days } = data;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const ink: [number, number, number] = [27, 27, 25];
  const brand: [number, number, number] = [16, 62, 39];
  const muted: [number, number, number] = [90, 90, 85];

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH, 210, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.text("EDUCAÇÃO", PAGE_WIDTH / 2, 20, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text("FOLHA DIÁRIA DE CONTROLE", PAGE_WIDTH / 2, 28, { align: "center" });

  doc.setDrawColor(180, 180, 172);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 34, PAGE_WIDTH - MARGIN, 34);

  drawInfoRow(doc, 41, { label: "COOPERADO (a):", value: employee.fullName }, { label: "MATRÍCULA:", value: employee.registration });
  drawInfoRow(doc, 48, { label: "FUNÇÃO:", value: employee.funcao }, { label: "CARGO:", value: employee.cargo });
  drawInfoRow(
    doc,
    55,
    { label: "LOTAÇÃO/LOCAL:", value: employee.lotacaoLocal },
    { label: "PERÍODO:", value: `${MONTHS[month - 1]} - ${year}` },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 85);
  doc.text(employee.cargaHoraria, PAGE_WIDTH / 2 - 18, 55);

  const holidayDays = new Map<number, DayRow>();
  days.forEach(day => {
    if (day.isHoliday) holidayDays.set(day.day, day);
  });

  let startY = 63;
  const availableHeight = 210 - startY - 14;
  const minRowHeight = Math.min(6.5, Math.max(3.6, availableHeight / Math.max(days.length, 1)));

  autoTable(doc, {
    startY,
    head: [COLUMN_TITLES],
    body: days.map(day => [
      String(day.day).padStart(2, "0"),
      day.weekday,
      day.entrada1,
      "",
      day.saida1,
      day.entrada2,
      day.saida2,
      "",
      "",
    ]),
    theme: "grid",
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: 0.9,
      lineColor: [120, 120, 112],
      lineWidth: 0.16,
      textColor: ink,
      minCellHeight: minRowHeight,
    },
    headStyles: {
      fillColor: brand,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 7.2,
      cellPadding: 1.2,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: COLUMN_WIDTHS[0] },
      1: { halign: "center", cellWidth: COLUMN_WIDTHS[1] },
      2: { halign: "center", cellWidth: COLUMN_WIDTHS[2] },
      3: { cellWidth: COLUMN_WIDTHS[3] },
      4: { halign: "center", cellWidth: COLUMN_WIDTHS[4] },
      5: { halign: "center", cellWidth: COLUMN_WIDTHS[5] },
      6: { halign: "center", cellWidth: COLUMN_WIDTHS[6] },
      7: { cellWidth: COLUMN_WIDTHS[7] },
      8: { cellWidth: COLUMN_WIDTHS[8] },
    },
    didParseCell: data => {
      if (data.section !== "body") return;
      const day = days[data.row.index];
      const coordinateKey = COORDINATE_COLUMNS[data.column.index];
      if (coordinateKey && day?.[coordinateKey]) {
        data.cell.styles.minCellHeight = 9.5;
      }
      if (!day?.isHoliday) return;
      if (data.column.index === 0) {
        data.cell.text = [`${String(day.day).padStart(2, "0")}*`];
        data.cell.styles.fontStyle = "bold";
      }
      data.cell.styles.fillColor = [238, 238, 232];
      data.cell.styles.textColor = [110, 110, 105];
      if (data.column.index === 3) {
        data.cell.text = [day.marked ? `FERIADO: ${day.holidayDescription}` : ""];
        data.cell.styles.fontStyle = "italic";
        data.cell.styles.fontSize = 6.4;
        data.cell.styles.textColor = [130, 130, 120];
      }
    },
    didDrawCell: data => {
      if (data.section !== "body") return;
      const day = days[data.row.index];
      const coordinateKey = COORDINATE_COLUMNS[data.column.index];
      const coordinate = coordinateKey ? day?.[coordinateKey] : null;
      if (!coordinate) return;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5);
      doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text(coordinate, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height - 1.5, { align: "center" });
    },
  });

  const tableBottom = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 40;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text("* Fim de semana ou feriado — não registrar horários de frequência.", MARGIN, 204);
  doc.text(
    `Emitido em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`,
    PAGE_WIDTH - MARGIN,
    204,
    { align: "right" },
  );

  doc.setDrawColor(180, 180, 172);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, tableBottom + 4, PAGE_WIDTH - MARGIN, tableBottom + 4);

  return doc;
}