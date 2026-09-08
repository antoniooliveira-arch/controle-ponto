import { and, asc, desc, eq, gte, gt, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  employees,
  employeeSessions,
  holidays,
  InsertUser,
  reportLogs,
  sectors,
  timeRecords,
  userSessions,
  users,
  workdays,
} from "../drizzle/schema";
import { calculateAttendance, getBusinessDate, getNextPunchType } from "./attendance";
import { ENV } from "./_core/env";
import { generateSessionToken, hashPassword, hashSessionToken, nextFailedLoginState, verifyPassword } from "./security";

const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

function getUserByLogin(db: ReturnType<typeof drizzle>, login: string) {
  const term = login.trim().toLowerCase();
  if (!term) return null;
  return db
    .select()
    .from(users)
    .where(or(eq(users.email, term), sql`lower(${users.name}) = ${term}`))
    .limit(1)
    .then(rows => rows[0] ?? null);
}

export async function loginAdmin(login: string, password: string) {
  const db = await requireDb();
  const userRow = await getUserByLogin(db, login);
  const now = new Date();
  if (!userRow || userRow.role !== "admin" || !userRow.passwordHash || (userRow.lockedUntil && userRow.lockedUntil > now)) {
    return null;
  }

  const matches = await verifyPassword(password, userRow.passwordHash);
  if (!matches) {
    await db.update(users).set(nextFailedLoginState(userRow.passwordFailures, now)).where(eq(users.id, userRow.id));
    return null;
  }

  await db.update(users).set({ passwordFailures: 0, lockedUntil: null, lastSignedIn: now, updatedAt: now }).where(eq(users.id, userRow.id));
  const token = generateSessionToken();
  await db.insert(userSessions).values({
    userId: userRow.id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
  });
  return {
    token,
    user: { ...userRow, passwordFailures: 0, lockedUntil: null, lastSignedIn: now },
  };
}

export async function getUserSession(token: string | null) {
  if (!token) return null;
  const db = await requireDb();
  const row = (
    await db
      .select({ user: users })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(userSessions.tokenHash, hashSessionToken(token)),
          isNull(userSessions.revokedAt),
          gt(userSessions.expiresAt, new Date()),
        ),
      )
      .limit(1)
  )[0];
  return row?.user ?? null;
}

export async function revokeUserSession(token: string | null) {
  if (!token) return;
  const db = await requireDb();
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(userSessions.tokenHash, hashSessionToken(token)), isNull(userSessions.revokedAt)));
}

function toEmployeeView(employee: typeof employees.$inferSelect, sectorName: string | null = null) {
  return {
    id: employee.id,
    fullName: employee.fullName,
    registration: employee.registration,
    sectorId: employee.sectorId,
    sectorName,
    funcao: employee.funcao,
    cargo: employee.cargo,
    lotacaoLocal: employee.lotacaoLocal,
    cargaHoraria: employee.cargaHoraria,
    active: employee.active,
    lockedUntil: employee.lockedUntil,
    createdAt: employee.createdAt,
  };
}

export function toReportEmployeeView(employee: typeof employees.$inferSelect, sectorName: string | null = null) {
  return {
    id: employee.id,
    fullName: employee.fullName,
    registration: employee.registration,
    sectorId: employee.sectorId,
    sectorName,
    funcao: employee.funcao ?? "",
    cargo: employee.cargo ?? "",
    lotacaoLocal: employee.lotacaoLocal ?? sectorName ?? "",
    cargaHoraria: employee.cargaHoraria ?? "8h",
  };
}

export async function listActiveEmployeesForLogin() {
  const db = await requireDb();
  return db
    .select({ id: employees.id, fullName: employees.fullName, registration: employees.registration })
    .from(employees)
    .where(eq(employees.active, true))
    .orderBy(asc(employees.fullName));
}

export async function loginEmployee(employeeId: number, password: string) {
  const db = await requireDb();
  const employee = (await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1))[0];
  const now = new Date();
  if (!employee || !employee.active || (employee.lockedUntil && employee.lockedUntil > now)) return null;

  const matches = await verifyPassword(password, employee.passwordHash);
  if (!matches) {
    await db
      .update(employees)
      .set(nextFailedLoginState(employee.passwordFailures, now))
      .where(eq(employees.id, employee.id));
    return null;
  }

  await db.update(employees).set({ passwordFailures: 0, lockedUntil: null }).where(eq(employees.id, employee.id));
  const token = generateSessionToken();
  await db.insert(employeeSessions).values({
    employeeId: employee.id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
  });
  return { token, employeeId: employee.id };
}

export async function getEmployeeSession(token: string | null) {
  if (!token) return null;
  const db = await requireDb();
  const row = (
    await db
      .select({ employee: employees, sectorName: sectors.name })
      .from(employeeSessions)
      .innerJoin(employees, eq(employeeSessions.employeeId, employees.id))
      .leftJoin(sectors, eq(employees.sectorId, sectors.id))
      .where(
        and(
          eq(employeeSessions.tokenHash, hashSessionToken(token)),
          isNull(employeeSessions.revokedAt),
          gt(employeeSessions.expiresAt, new Date()),
          eq(employees.active, true),
        ),
      )
      .limit(1)
  )[0];
  return row ? toEmployeeView(row.employee, row.sectorName) : null;
}

export async function revokeEmployeeSession(token: string | null) {
  if (!token) return;
  const db = await requireDb();
  await db
    .update(employeeSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(employeeSessions.tokenHash, hashSessionToken(token)), isNull(employeeSessions.revokedAt)));
}

export async function getEmployeeToday(employeeId: number) {
  const db = await requireDb();
  const businessDate = getBusinessDate();
  const records = await db
    .select({ id: timeRecords.id, type: timeRecords.type, recordedAt: timeRecords.recordedAt, latitude: timeRecords.latitude, longitude: timeRecords.longitude })
    .from(timeRecords)
    .where(and(eq(timeRecords.employeeId, employeeId), eq(timeRecords.businessDate, businessDate)))
    .orderBy(asc(timeRecords.recordedAt));
  return { businessDate, records, summary: calculateAttendance(records) };
}

export async function registerEmployeePunch(employeeId: number, location: { latitude: number; longitude: number }) {
  const db = await requireDb();
  const now = new Date();
  const businessDate = getBusinessDate(now);

  if (
    !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) ||
    location.latitude < -90 || location.latitude > 90 ||
    location.longitude < -180 || location.longitude > 180
  ) {
    throw new Error("A coordenada geográfica é obrigatória e inválida. A batida não foi registrada.");
  }

  return db.transaction(async tx => {
    await tx
      .insert(workdays)
      .values({ employeeId, businessDate, status: "OPEN" })
      .onConflictDoUpdate({ target: [workdays.employeeId, workdays.businessDate], set: { updatedAt: now } });

    const workday = (
      await tx
        .select()
        .from(workdays)
        .where(and(eq(workdays.employeeId, employeeId), eq(workdays.businessDate, businessDate)))
        .limit(1)
    )[0];
    if (!workday) throw new Error("Não foi possível inicializar a jornada.");

    const existing = await tx
      .select({ type: timeRecords.type, recordedAt: timeRecords.recordedAt })
      .from(timeRecords)
      .where(eq(timeRecords.workdayId, workday.id))
      .orderBy(asc(timeRecords.recordedAt));
    const expected = getNextPunchType(existing);
    if (!expected || workday.status === "COMPLETE") {
      throw new Error("A jornada de hoje já está encerrada ou possui uma sequência inválida.");
    }

    await tx.insert(timeRecords).values({
      workdayId: workday.id,
      employeeId,
      businessDate,
      type: expected,
      recordedAt: now,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    if (expected === "SAIDA_FINAL") {
      await tx.update(workdays).set({ status: "COMPLETE", updatedAt: now }).where(eq(workdays.id, workday.id));
    }

    const records = [...existing, { type: expected, recordedAt: now }];
    return { businessDate, recordedType: expected, records, summary: calculateAttendance(records, now) };
  });
}

export async function listSectors() {
  const db = await requireDb();
  return db.select().from(sectors).orderBy(asc(sectors.name));
}

export async function createSector(name: string) {
  const db = await requireDb();
  const result = await db.insert(sectors).values({ name: name.trim() }).returning({ id: sectors.id });
  return result[0].id;
}

export async function updateSector(sectorId: number, input: { name: string; active: boolean }) {
  const db = await requireDb();
  await db.update(sectors).set({ name: input.name.trim(), active: input.active }).where(eq(sectors.id, sectorId));
}

export async function listEmployees() {
  const db = await requireDb();
  const rows = await db
    .select({ employee: employees, sectorName: sectors.name })
    .from(employees)
    .leftJoin(sectors, eq(employees.sectorId, sectors.id))
    .orderBy(asc(employees.fullName));
  return rows.map(row => toEmployeeView(row.employee, row.sectorName));
}

export async function createEmployee(input: {
  fullName: string;
  registration: string;
  sectorId?: number | null;
  password: string;
  funcao?: string | null;
  cargo?: string | null;
  lotacaoLocal?: string | null;
  cargaHoraria?: string | null;
}) {
  const db = await requireDb();
  const passwordHash = await hashPassword(input.password);
  const result = await db.insert(employees).values({
    fullName: input.fullName.trim(),
    registration: input.registration.trim(),
    sectorId: input.sectorId ?? null,
    funcao: input.funcao?.trim() || null,
    cargo: input.cargo?.trim() || null,
    lotacaoLocal: input.lotacaoLocal?.trim() || null,
    cargaHoraria: input.cargaHoraria?.trim() || null,
    passwordHash,
  }).returning({ id: employees.id });
  return result[0].id;
}

export async function updateEmployee(
  employeeId: number,
  input: {
    fullName: string;
    registration: string;
    sectorId?: number | null;
    active: boolean;
    funcao?: string | null;
    cargo?: string | null;
    lotacaoLocal?: string | null;
    cargaHoraria?: string | null;
  },
) {
  const db = await requireDb();
  await db
    .update(employees)
    .set({
      fullName: input.fullName.trim(),
      registration: input.registration.trim(),
      sectorId: input.sectorId ?? null,
      funcao: input.funcao?.trim() || null,
      cargo: input.cargo?.trim() || null,
      lotacaoLocal: input.lotacaoLocal?.trim() || null,
      cargaHoraria: input.cargaHoraria?.trim() || null,
      active: input.active,
    })
    .where(eq(employees.id, employeeId));
  if (!input.active) {
    await db.update(employeeSessions).set({ revokedAt: new Date() }).where(eq(employeeSessions.employeeId, employeeId));
  }
}

export async function resetEmployeePassword(employeeId: number, password: string) {
  const db = await requireDb();
  await db
    .update(employees)
    .set({ passwordHash: await hashPassword(password), passwordFailures: 0, lockedUntil: null })
    .where(eq(employees.id, employeeId));
  await db.update(employeeSessions).set({ revokedAt: new Date() }).where(eq(employeeSessions.employeeId, employeeId));
}

export async function changeOwnAdminPassword(adminId: number, password: string) {
  const db = await requireDb();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), passwordFailures: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(users.id, adminId));
  await db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.userId, adminId));
}

export async function getAdminDashboard(businessDate = getBusinessDate()) {
  const db = await requireDb();
  const employeeRows = await db
    .select({ employee: employees, sectorName: sectors.name })
    .from(employees)
    .leftJoin(sectors, eq(employees.sectorId, sectors.id))
    .where(eq(employees.active, true))
    .orderBy(asc(employees.fullName));
  const records = await db
    .select({ employeeId: timeRecords.employeeId, type: timeRecords.type, recordedAt: timeRecords.recordedAt, latitude: timeRecords.latitude, longitude: timeRecords.longitude })
    .from(timeRecords)
    .where(eq(timeRecords.businessDate, businessDate))
    .orderBy(asc(timeRecords.recordedAt));
  const byEmployee = new Map<number, typeof records>();
  records.forEach(record => byEmployee.set(record.employeeId, [...(byEmployee.get(record.employeeId) ?? []), record]));
  return {
    businessDate,
    rows: employeeRows.map(({ employee, sectorName }) => {
      const employeeRecords = byEmployee.get(employee.id) ?? [];
      return { employee: toEmployeeView(employee, sectorName), records: employeeRecords, summary: calculateAttendance(employeeRecords) };
    }),
  };
}

export async function getAttendanceReport(input: { startDate: string; endDate: string; employeeId?: number }) {
  const db = await requireDb();
  const conditions = [gte(timeRecords.businessDate, input.startDate), lte(timeRecords.businessDate, input.endDate)];
  if (input.employeeId) conditions.push(eq(timeRecords.employeeId, input.employeeId));
  const records = await db
    .select({ employeeId: timeRecords.employeeId, businessDate: timeRecords.businessDate, type: timeRecords.type, recordedAt: timeRecords.recordedAt })
    .from(timeRecords)
    .where(and(...conditions))
    .orderBy(desc(timeRecords.businessDate), asc(timeRecords.recordedAt));
  const employeeIds = Array.from(new Set(records.map(record => record.employeeId)));
  const roster = employeeIds.length
    ? await db.select().from(employees).where(input.employeeId ? eq(employees.id, input.employeeId) : undefined)
    : [];
  const employeesById = new Map(roster.map(employee => [employee.id, employee]));
  const grouped = new Map<string, typeof records>();
  records.forEach(record => {
    const key = `${record.employeeId}|${record.businessDate}`;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  });
  return Array.from(grouped.entries()).map(([key, dayRecords]) => {
    const [employeeIdText, businessDate] = key.split("|");
    const employee = employeesById.get(Number(employeeIdText));
    return {
      businessDate,
      employee: employee ? toEmployeeView(employee) : null,
      records: dayRecords,
      summary: calculateAttendance(dayRecords, new Date(), false),
    };
  });
}

export async function listHolidays() {
  const db = await requireDb();
  return db.select().from(holidays).orderBy(asc(holidays.date));
}

export async function addHoliday(date: string, description?: string) {
  const db = await requireDb();
  await db
    .insert(holidays)
    .values({ date, description: description?.trim() || null })
    .onConflictDoUpdate({ target: holidays.date, set: { description: description?.trim() || null } });
}

export async function removeHoliday(date: string) {
  const db = await requireDb();
  await db.delete(holidays).where(eq(holidays.date, date));
}

export async function getMonthlyReport(input: { employeeId: number; month: number; year: number }) {
  const db = await requireDb();
  const employeeRow = (
    await db
      .select({ employee: employees, sectorName: sectors.name })
      .from(employees)
      .leftJoin(sectors, eq(employees.sectorId, sectors.id))
      .where(eq(employees.id, input.employeeId))
      .limit(1)
  )[0];
  if (!employeeRow) return null;

  const startDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
  const monthEnd = new Date(input.year, input.month, 0);
  const endDate = `${input.year}-${String(input.month).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;

  const records = await db
    .select({
      businessDate: timeRecords.businessDate,
      type: timeRecords.type,
      recordedAt: timeRecords.recordedAt,
    })
    .from(timeRecords)
    .where(
      and(
        eq(timeRecords.employeeId, input.employeeId),
        gte(timeRecords.businessDate, startDate),
        lte(timeRecords.businessDate, endDate),
      ),
    )
    .orderBy(asc(timeRecords.businessDate), asc(timeRecords.recordedAt));

  const daysInMonth = monthEnd.getDate();
  const dayRecords: { [day: number]: { type: string; recordedAt: Date }[] } = {};
  records.forEach(record => {
    const day = Number(record.businessDate.slice(8, 10));
    dayRecords[day] = [...(dayRecords[day] ?? []), { type: record.type, recordedAt: record.recordedAt }];
  });

  return {
    employee: toReportEmployeeView(employeeRow.employee, employeeRow.sectorName),
    month: input.month,
    year: input.year,
    startDate,
    endDate,
    days: Array.from({ length: daysInMonth }, (_, index) => index + 1).map(day => ({
      day,
      records: dayRecords[day] ?? [],
    })),
  };
}

export async function listReportLogs(limit = 50) {
  const db = await requireDb();
  return db
    .select({
      id: reportLogs.id,
      employeeId: reportLogs.employeeId,
      month: reportLogs.month,
      year: reportLogs.year,
      issuedBy: reportLogs.issuedBy,
      issuedAt: reportLogs.issuedAt,
      fileName: reportLogs.fileName,
      employeeName: employees.fullName,
      registration: employees.registration,
      lotacaoLocal: employees.lotacaoLocal,
    })
    .from(reportLogs)
    .leftJoin(employees, eq(reportLogs.employeeId, employees.id))
    .orderBy(desc(reportLogs.issuedAt))
    .limit(limit);
}

export async function logReport(input: {
  employeeId: number;
  month: number;
  year: number;
  issuedBy?: string | null;
  fileName?: string | null;
}) {
  const db = await requireDb();
  await db.insert(reportLogs).values({
    employeeId: input.employeeId,
    month: input.month,
    year: input.year,
    issuedBy: input.issuedBy ?? null,
    fileName: input.fileName ?? null,
  });
}
