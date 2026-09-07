import { describe, expect, it } from "vitest";
import { calculateAttendance, getNextPunchType, PUNCH_SEQUENCE } from "./attendance";

const at = (hour: number, minute = 0) => new Date(2026, 8, 7, hour, minute, 0);

describe("sequência obrigatória de quatro batidas", () => {
  it("libera somente a primeira batida quando a jornada está vazia", () => {
    expect(getNextPunchType([])).toBe("ENTRADA");
  });

  it("avança uma etapa por vez e encerra após a saída final", () => {
    expect(getNextPunchType([{ type: "ENTRADA" }])).toBe("SAIDA_INTERVALO");
    expect(getNextPunchType([{ type: "ENTRADA" }, { type: "SAIDA_INTERVALO" }])).toBe("RETORNO_INTERVALO");
    expect(getNextPunchType(PUNCH_SEQUENCE.map(type => ({ type })))).toBeNull();
  });

  it("rejeita batidas duplicadas e etapas fora de ordem", () => {
    expect(getNextPunchType([{ type: "ENTRADA" }, { type: "ENTRADA" }])).toBeNull();
    expect(getNextPunchType([{ type: "ENTRADA" }, { type: "SAIDA_FINAL" }])).toBeNull();
    expect(getNextPunchType([{ type: "RETORNO_INTERVALO" }])).toBeNull();
  });
});

describe("cálculo da jornada", () => {
  it("subtrai o intervalo do tempo trabalhado em uma jornada encerrada", () => {
    const summary = calculateAttendance([
      { type: "ENTRADA", recordedAt: at(7, 30) },
      { type: "SAIDA_INTERVALO", recordedAt: at(12) },
      { type: "RETORNO_INTERVALO", recordedAt: at(13) },
      { type: "SAIDA_FINAL", recordedAt: at(17, 30) },
    ], at(18), false);
    expect(summary.workedSeconds).toBe(9 * 60 * 60);
    expect(summary.intervalSeconds).toBe(60 * 60);
    expect(summary.status).toBe("COMPLETA");
    expect(summary.nextType).toBeNull();
  });

  it("calcula a duração em curso sem antecipar uma batida", () => {
    const summary = calculateAttendance([{ type: "ENTRADA", recordedAt: at(8) }], at(10, 15));
    expect(summary.workedSeconds).toBe(2 * 60 * 60 + 15 * 60);
    expect(summary.intervalSeconds).toBe(0);
    expect(summary.nextType).toBe("SAIDA_INTERVALO");
    expect(summary.status).toBe("TRABALHANDO");
  });
});
