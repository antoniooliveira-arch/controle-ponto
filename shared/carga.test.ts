import { describe, expect, it } from "vitest";
import {
  calculateCargaTotals,
  cargaSegundosDiarios,
  evaluateCarga,
  formatDuration,
  formatSignedDuration,
  formatWeeklyLoad,
  getWeekBounds,
  normaliseCargaSemanal,
  TOLERANCIA_SEGUNDOS,
} from "./carga";

const H = 60 * 60;

describe("carga semanal", () => {
  it("normaliza valores ausentes para a carga padrão", () => {
    expect(normaliseCargaSemanal(null)).toBe(40);
    expect(normaliseCargaSemanal(0)).toBe(40);
    expect(normaliseCargaSemanal(Number.NaN)).toBe(40);
    expect(normaliseCargaSemanal(29.6)).toBe(30);
  });

  it("distribui a carga semanal apenas nos dias úteis", () => {
    // 2026-09-07 é segunda-feira e 2026-09-12 é sábado.
    expect(cargaSegundosDiarios(40, "2026-09-07")).toBe(8 * H);
    expect(cargaSegundosDiarios(20, "2026-09-07")).toBe(4 * H);
    expect(cargaSegundosDiarios(40, "2026-09-12")).toBe(0);
  });

  it("monta os limites da semana de segunda a domingo", () => {
    expect(getWeekBounds("2026-09-09")).toEqual({ startDate: "2026-09-07", endDate: "2026-09-13" });
    expect(getWeekBounds("2026-09-13")).toEqual({ startDate: "2026-09-07", endDate: "2026-09-13" });
    expect(getWeekBounds("invalido")).toBeNull();
  });

  it("formata a carga semanal para exibição", () => {
    expect(formatWeeklyLoad(30)).toBe("30h semanais");
  });
});

describe("avaliação da carga diária", () => {
  const base = { expectedSeconds: 8 * H, isComplete: true };

  it("classifica a jornada dentro da carga prevista", () => {
    const result = evaluateCarga({ ...base, workedSeconds: 8 * H });
    expect(result.situation).toBe("DENTRO_DA_CARGA");
    expect(result.deltaSeconds).toBe(0);
  });

  it("aceita diferenças dentro da tolerância configurada", () => {
    expect(evaluateCarga({ ...base, workedSeconds: 8 * H + 5 * 60 }).situation).toBe("TOLERANCIA");
    expect(evaluateCarga({ ...base, workedSeconds: 8 * H - 5 * 60 }).situation).toBe("TOLERANCIA");
    expect(TOLERANCIA_SEGUNDOS).toBe(10 * 60);
  });

  it("separa excesso de falta acima da tolerância", () => {
    const excesso = evaluateCarga({ ...base, workedSeconds: 8 * H + 45 * 60 });
    expect(excesso.situation).toBe("EXCEDENTE");
    expect(excesso.deltaSeconds).toBe(45 * 60);

    const falta = evaluateCarga({ ...base, workedSeconds: 8 * H - 45 * 60 });
    expect(falta.situation).toBe("DEFICITARIO");
    expect(falta.deltaSeconds).toBe(-45 * 60);
  });

  it("trabalhar fora da carga prevista não gera déficit", () => {
    const result = evaluateCarga({ expectedSeconds: 0, workedSeconds: 4 * H, isComplete: true });
    expect(result.situation).toBe("SEM_CARGA_PREVISTA");
    expect(result.deltaSeconds).toBe(4 * H);
  });

  it("mantém a jornada aberta como em andamento", () => {
    const result = evaluateCarga({ expectedSeconds: 8 * H, workedSeconds: 9 * H, isComplete: false });
    expect(result.situation).toBe("EM_ANDAMENTO");
    expect(result.deltaSeconds).toBe(H);
  });

  it("formata o saldo com sinal e dois dígitos", () => {
    expect(formatSignedDuration(45 * 60)).toBe("+00:45");
    expect(formatSignedDuration(-45 * 60)).toBe("-00:45");
    expect(formatSignedDuration(0)).toBe("00:00");
    expect(formatDuration(9 * H + 30 * 60)).toBe("09:30");
  });
});

describe("totais mensais de carga", () => {
  const carga = (situation: string, expectedSeconds: number, deltaSeconds: number) => ({
    expectedSeconds,
    workedSeconds: expectedSeconds + deltaSeconds,
    deltaSeconds,
    situation,
  } as never);

  it("agrega excesso, falta e dias regulares", () => {
    const totals = calculateCargaTotals([
      { carga: carga("EXCEDENTE", 8 * H, 45 * 60) },
      { carga: carga("DEFICITARIO", 8 * H, -30 * 60) },
      { carga: carga("DENTRO_DA_CARGA", 8 * H, 0) },
      { carga: carga("TOLERANCIA", 8 * H, 3 * 60) },
    ]);

    expect(totals.diasExcesso).toBe(1);
    expect(totals.diasFalta).toBe(1);
    expect(totals.diasRegulares).toBe(2);
    expect(totals.segundosExcesso).toBe(45 * 60);
    expect(totals.segundosFalta).toBe(30 * 60);
    expect(totals.totalExpectedSeconds).toBe(32 * H);
    expect(totals.netDeltaSeconds).toBe(18 * 60);
  });

  it("ignora dias sem carga apurada e jornadas em andamento", () => {
    const totals = calculateCargaTotals([
      { carga: null },
      { carga: undefined },
      {},
      { carga: carga("EM_ANDAMENTO", 8 * H, 2 * H) },
    ]);
    expect(totals.totalWorkedSeconds).toBe(0);
    expect(totals.totalExpectedSeconds).toBe(0);
    expect(totals.diasExcesso).toBe(0);
    expect(totals.diasFalta).toBe(0);
    expect(totals.diasRegulares).toBe(0);
  });

  it("soma o trabalho de fora da carga prevista no total trabalhado", () => {
    const totals = calculateCargaTotals([{ carga: carga("SEM_CARGA_PREVISTA", 0, 4 * H) }]);
    expect(totals.totalWorkedSeconds).toBe(4 * H);
    expect(totals.totalExpectedSeconds).toBe(0);
    expect(totals.netDeltaSeconds).toBe(4 * H);
    expect(totals.diasExcesso).toBe(0);
  });
});
