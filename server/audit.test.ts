import { describe, expect, it } from "vitest";
import { buildPunchAuditEntries, normaliseAuditReason, MOTIVO_MINIMO } from "./audit";
import type { PunchType } from "./attendance";

const at = (hour: number, minute = 0) => new Date(2026, 8, 7, hour, minute, 0);

const base = {
  employeeId: 1,
  employeeName: "Maria Souza",
  registration: "1234",
  workdayId: 10,
  businessDate: "2026-09-07",
  reason: "Servidor esqueceu de bater a saída no terminal.",
  adjustedById: 99,
  adjustedBy: "Administrador",
  at: at(12, 0),
};

const existing = (entries: [PunchType, Date][]) =>
  entries.map(([type, recordedAt]) => ({ type, recordedAt }));

const desired = (entries: [PunchType, Date][]) => new Map(entries);

describe("diff de auditoria dos ajustes de batida", () => {
  it("registra INSERT para batida que não existia na jornada", () => {
    const entries = buildPunchAuditEntries({
      ...base,
      existing: existing([]),
      desired: desired([["ENTRADA", at(7, 30)]]),
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "INSERT",
      punchType: "ENTRADA",
      previousRecordedAt: null,
      newRecordedAt: at(7, 30),
    });
  });

  it("registra UPDATE com o horário anterior e o novo", () => {
    const entries = buildPunchAuditEntries({
      ...base,
      existing: existing([["ENTRADA", at(8, 0)]]),
      desired: desired([["ENTRADA", at(7, 30)]]),
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "UPDATE",
      punchType: "ENTRADA",
      previousRecordedAt: at(8, 0),
      newRecordedAt: at(7, 30),
    });
  });

  it("registra DELETE com o horário removido e sem novo horário", () => {
    const entries = buildPunchAuditEntries({
      ...base,
      existing: existing([
        ["ENTRADA", at(7, 30)],
        ["SAIDA_FINAL", at(17, 30)],
      ]),
      desired: desired([["ENTRADA", at(7, 30)]]),
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "DELETE",
      punchType: "SAIDA_FINAL",
      previousRecordedAt: at(17, 30),
      newRecordedAt: null,
    });
  });

  it("não gera entrada quando o horário permanece idêntico", () => {
    const entries = buildPunchAuditEntries({
      ...base,
      existing: existing([
        ["ENTRADA", at(7, 30)],
        ["SAIDA_FINAL", at(17, 30)],
      ]),
      desired: desired([
        ["ENTRADA", at(7, 30)],
        ["SAIDA_FINAL", at(17, 30)],
      ]),
    });
    expect(entries).toEqual([]);
  });

  it("distingue as três ações na mesma jornada corrigida", () => {
    const entries = buildPunchAuditEntries({
      ...base,
      existing: existing([
        ["ENTRADA", at(8, 0)],
        ["SAIDA_INTERVALO", at(12, 0)],
        ["SAIDA_FINAL", at(17, 0)],
      ]),
      desired: desired([
        ["ENTRADA", at(7, 30)],
        ["SAIDA_INTERVALO", at(12, 0)],
        ["RETORNO_INTERVALO", at(13, 0)],
      ]),
    });
    expect(entries.map(entry => [entry.action, entry.punchType])).toEqual([
      ["UPDATE", "ENTRADA"],
      ["INSERT", "RETORNO_INTERVALO"],
      ["DELETE", "SAIDA_FINAL"],
    ]);
  });

  it("exige justificativa com ao menos o mínimo de caracteres", () => {
    expect(() =>
      buildPunchAuditEntries({
        ...base,
        reason: "curta",
        existing: existing([]),
        desired: desired([["ENTRADA", at(7, 30)]]),
      }),
    ).toThrow(/justificativa/i);
  });

  it("repropaga motivo, observação e autoria em todas as entradas", () => {
    const entries = buildPunchAuditEntries({
      ...base,
      notes: "  conferido com a chefia  ",
      existing: existing([]),
      desired: desired([
        ["ENTRADA", at(7, 30)],
        ["SAIDA_FINAL", at(17, 30)],
      ]),
    });
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.reason).toBe(base.reason);
      expect(entry.notes).toBe("conferido com a chefia");
      expect(entry.adjustedById).toBe(99);
      expect(entry.adjustedBy).toBe("Administrador");
      expect(entry.employeeName).toBe("Maria Souza");
      expect(entry.registration).toBe("1234");
      expect(entry.businessDate).toBe("2026-09-07");
      expect(entry.workdayId).toBe(10);
      expect(entry.createdAt).toEqual(at(12, 0));
    }
  });
});

describe("normalização da justificativa", () => {
  it("descarta espaços e aceita exatamente o mínimo", () => {
    const exact = "a".repeat(MOTIVO_MINIMO);
    expect(normaliseAuditReason(`  ${exact}  `)).toEqual({ reason: exact, notes: null });
  });

  it("trata observação vazia como ausente", () => {
    expect(normaliseAuditReason("justificativa válida", "   ")).toEqual({
      reason: "justificativa válida",
      notes: null,
    });
  });
});
