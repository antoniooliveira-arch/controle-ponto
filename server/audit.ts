import type { PunchType } from "./attendance";

export type PunchAuditAction = "INSERT" | "UPDATE" | "DELETE";

export type AuditablePunch = {
  type: PunchType;
  recordedAt: Date;
};

export type PunchAuditEntryInput = {
  employeeId: number;
  employeeName: string;
  registration?: string | null;
  workdayId: number;
  businessDate: string;
  action: PunchAuditAction;
  punchType: PunchType;
  previousRecordedAt: Date | null;
  newRecordedAt: Date | null;
  reason: string;
  notes?: string | null;
  adjustedById: number;
  adjustedBy: string;
  createdAt: Date;
};

export const MOTIVO_MINIMO = 10;

export function normaliseAuditReason(reason: string, notes?: string | null) {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < MOTIVO_MINIMO) {
    throw new Error(
      `Informe a justificativa do ajuste com ao menos ${MOTIVO_MINIMO} caracteres.`,
    );
  }
  const trimmedNotes = notes?.trim() || null;
  return { reason: trimmedReason, notes: trimmedNotes };
}

export function buildPunchAuditEntries(input: {
  employeeId: number;
  employeeName: string;
  registration?: string | null;
  workdayId: number;
  businessDate: string;
  existing: AuditablePunch[];
  desired: Map<PunchType, Date>;
  reason: string;
  notes?: string | null;
  adjustedById: number;
  adjustedBy: string;
  at: Date;
}): PunchAuditEntryInput[] {
  const { reason, notes } = normaliseAuditReason(input.reason, input.notes);
  const currentByType = new Map(input.existing.map(record => [record.type, record]));
  const entries: PunchAuditEntryInput[] = [];

  const base = {
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    registration: input.registration ?? null,
    workdayId: input.workdayId,
    businessDate: input.businessDate,
    reason,
    notes,
    adjustedById: input.adjustedById,
    adjustedBy: input.adjustedBy,
    createdAt: input.at,
  };

  for (const [type, recordedAt] of Array.from(input.desired)) {
    const current = currentByType.get(type);
    if (!current) {
      entries.push({
        ...base,
        action: "INSERT",
        punchType: type,
        previousRecordedAt: null,
        newRecordedAt: recordedAt,
      });
      continue;
    }
    if (current.recordedAt.getTime() === recordedAt.getTime()) continue;
    entries.push({
      ...base,
      action: "UPDATE",
      punchType: type,
      previousRecordedAt: current.recordedAt,
      newRecordedAt: recordedAt,
    });
  }

  for (const record of input.existing) {
    if (input.desired.has(record.type)) continue;
    entries.push({
      ...base,
      action: "DELETE",
      punchType: record.type,
      previousRecordedAt: record.recordedAt,
      newRecordedAt: null,
    });
  }

  return entries;
}
