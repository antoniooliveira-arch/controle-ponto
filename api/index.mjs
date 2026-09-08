// server/_core/app.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/db.ts
import { and, asc, desc, eq, gte, gt, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// drizzle/schema.ts
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var statusEnum = pgEnum("status", ["OPEN", "COMPLETE"]);
var users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: roleEnum("role").default("user").notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }),
    passwordFailures: integer("passwordFailures").default(0).notNull(),
    lockedUntil: timestamp("lockedUntil"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_name_idx").on(table.name)
  ]
);
var sectors = pgTable(
  "sectors",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [uniqueIndex("sectors_name_unique").on(table.name)]
);
var employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    fullName: varchar("fullName", { length: 180 }).notNull(),
    registration: varchar("registration", { length: 64 }).notNull(),
    sectorId: integer("sectorId").references(() => sectors.id, { onDelete: "set null" }),
    funcao: varchar("funcao", { length: 180 }),
    cargo: varchar("cargo", { length: 180 }),
    lotacaoLocal: varchar("lotacaoLocal", { length: 180 }),
    cargaHoraria: varchar("cargaHoraria", { length: 20 }).default("8h"),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    active: boolean("active").default(true).notNull(),
    passwordFailures: integer("passwordFailures").default(0).notNull(),
    lockedUntil: timestamp("lockedUntil"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("employees_registration_unique").on(table.registration),
    index("employees_sector_idx").on(table.sectorId),
    index("employees_active_idx").on(table.active)
  ]
);
var employeeSessions = pgTable(
  "employee_sessions",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("employee_sessions_token_unique").on(table.tokenHash),
    index("employee_sessions_employee_idx").on(table.employeeId)
  ]
);
var userSessions = pgTable(
  "user_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("user_sessions_token_unique").on(table.tokenHash),
    index("user_sessions_user_idx").on(table.userId)
  ]
);
var workdays = pgTable(
  "workdays",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    businessDate: varchar("businessDate", { length: 10 }).notNull(),
    status: statusEnum("status").default("OPEN").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("workdays_employee_date_unique").on(table.employeeId, table.businessDate),
    index("workdays_date_idx").on(table.businessDate)
  ]
);
var timeRecordType = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA_FINAL"
];
var timeRecordTypeEnum = pgEnum("time_record_type", timeRecordType);
var timeRecords = pgTable(
  "time_records",
  {
    id: serial("id").primaryKey(),
    workdayId: integer("workdayId").notNull().references(() => workdays.id, { onDelete: "cascade" }),
    employeeId: integer("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    businessDate: varchar("businessDate", { length: 10 }).notNull(),
    type: timeRecordTypeEnum("type").notNull(),
    recordedAt: timestamp("recordedAt").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("time_records_workday_type_unique").on(table.workdayId, table.type),
    index("time_records_employee_date_idx").on(table.employeeId, table.businessDate),
    index("time_records_date_idx").on(table.businessDate)
  ]
);
var holidays = pgTable(
  "holidays",
  {
    id: serial("id").primaryKey(),
    date: varchar("date", { length: 10 }).notNull(),
    description: varchar("description", { length: 180 }),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [uniqueIndex("holidays_date_unique").on(table.date)]
);
var reportLogs = pgTable(
  "report_logs",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    issuedBy: varchar("issuedBy", { length: 180 }),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
    fileName: varchar("fileName", { length: 255 })
  },
  (table) => [index("report_logs_employee_month_year_idx").on(table.employeeId, table.month, table.year)]
);

// server/attendance.ts
var PUNCH_SEQUENCE = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA_FINAL"
];
var BUSINESS_TIMEZONE = "America/Cuiaba";
function getBusinessDate(date = /* @__PURE__ */ new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function getNextPunchType(records) {
  const hasValidSequence = records.every((record, index2) => record.type === PUNCH_SEQUENCE[index2]);
  if (!hasValidSequence) return null;
  return PUNCH_SEQUENCE[records.length] ?? null;
}
function calculateAttendance(records, now = /* @__PURE__ */ new Date(), includeOpenDuration = true) {
  const byType = new Map(records.map((record) => [record.type, record.recordedAt]));
  const entry = byType.get("ENTRADA");
  const intervalOut = byType.get("SAIDA_INTERVALO");
  const intervalReturn = byType.get("RETORNO_INTERVALO");
  const finalOut = byType.get("SAIDA_FINAL");
  const secondsBetween = (from, to) => from && to ? Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1e3)) : 0;
  let workedSeconds = secondsBetween(entry, intervalOut) + secondsBetween(intervalReturn, finalOut);
  let intervalSeconds = secondsBetween(intervalOut, intervalReturn);
  if (includeOpenDuration) {
    if (entry && !intervalOut) workedSeconds += secondsBetween(entry, now);
    if (intervalOut && !intervalReturn) intervalSeconds += secondsBetween(intervalOut, now);
    if (intervalReturn && !finalOut) workedSeconds += secondsBetween(intervalReturn, now);
  }
  const nextType = getNextPunchType(records);
  const status = !entry ? "SEM_ENTRADA" : finalOut ? "COMPLETA" : intervalOut && !intervalReturn ? "EM_INTERVALO" : "TRABALHANDO";
  return { workedSeconds, intervalSeconds, isComplete: Boolean(finalOut), nextType, status };
}

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/security.ts
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
var scrypt = promisify(scryptCallback);
var MAX_LOGIN_FAILURES = 5;
var LOGIN_LOCK_MS = 15 * 60 * 1e3;
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}
async function verifyPassword(password, storedHash) {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const derived = await scrypt(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
}
function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}
function nextFailedLoginState(failures, now = /* @__PURE__ */ new Date()) {
  const nextFailures = failures + 1;
  return nextFailures >= MAX_LOGIN_FAILURES ? { passwordFailures: 0, lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MS) } : { passwordFailures: nextFailures, lockedUntil: null };
}

// server/db.ts
var SESSION_LIFETIME_MS = 12 * 60 * 60 * 1e3;
var _db = null;
var _pool = null;
async function getDb() {
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
  if (!db) throw new Error("Banco de dados indispon\xEDvel.");
  return db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date() };
  const updateSet = { lastSignedIn: values.lastSignedIn };
  ["name", "email", "loginMethod"].forEach((field) => {
    if (user[field] !== void 0) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
function getUserByLogin(db, login) {
  const term = login.trim().toLowerCase();
  if (!term) return null;
  return db.select().from(users).where(or(eq(users.email, term), sql`lower(${users.name}) = ${term}`)).limit(1).then((rows) => rows[0] ?? null);
}
async function loginAdmin(login, password) {
  const db = await requireDb();
  const userRow = await getUserByLogin(db, login);
  const now = /* @__PURE__ */ new Date();
  if (!userRow || userRow.role !== "admin" || !userRow.passwordHash || userRow.lockedUntil && userRow.lockedUntil > now) {
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
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS)
  });
  return {
    token,
    user: { ...userRow, passwordFailures: 0, lockedUntil: null, lastSignedIn: now }
  };
}
async function getUserSession(token) {
  if (!token) return null;
  const db = await requireDb();
  const row = (await db.select({ user: users }).from(userSessions).innerJoin(users, eq(userSessions.userId, users.id)).where(
    and(
      eq(userSessions.tokenHash, hashSessionToken(token)),
      isNull(userSessions.revokedAt),
      gt(userSessions.expiresAt, /* @__PURE__ */ new Date())
    )
  ).limit(1))[0];
  return row?.user ?? null;
}
async function revokeUserSession(token) {
  if (!token) return;
  const db = await requireDb();
  await db.update(userSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and(eq(userSessions.tokenHash, hashSessionToken(token)), isNull(userSessions.revokedAt)));
}
function toEmployeeView(employee, sectorName = null) {
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
    createdAt: employee.createdAt
  };
}
function toReportEmployeeView(employee, sectorName = null) {
  return {
    id: employee.id,
    fullName: employee.fullName,
    registration: employee.registration,
    sectorId: employee.sectorId,
    sectorName,
    funcao: employee.funcao ?? "",
    cargo: employee.cargo ?? "",
    lotacaoLocal: employee.lotacaoLocal ?? sectorName ?? "",
    cargaHoraria: employee.cargaHoraria ?? "8h"
  };
}
async function listActiveEmployeesForLogin() {
  const db = await requireDb();
  return db.select({ id: employees.id, fullName: employees.fullName, registration: employees.registration }).from(employees).where(eq(employees.active, true)).orderBy(asc(employees.fullName));
}
async function loginEmployee(employeeId, password) {
  const db = await requireDb();
  const employee = (await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1))[0];
  const now = /* @__PURE__ */ new Date();
  if (!employee || !employee.active || employee.lockedUntil && employee.lockedUntil > now) return null;
  const matches = await verifyPassword(password, employee.passwordHash);
  if (!matches) {
    await db.update(employees).set(nextFailedLoginState(employee.passwordFailures, now)).where(eq(employees.id, employee.id));
    return null;
  }
  await db.update(employees).set({ passwordFailures: 0, lockedUntil: null }).where(eq(employees.id, employee.id));
  const token = generateSessionToken();
  await db.insert(employeeSessions).values({
    employeeId: employee.id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS)
  });
  return { token, employeeId: employee.id };
}
async function getEmployeeSession(token) {
  if (!token) return null;
  const db = await requireDb();
  const row = (await db.select({ employee: employees, sectorName: sectors.name }).from(employeeSessions).innerJoin(employees, eq(employeeSessions.employeeId, employees.id)).leftJoin(sectors, eq(employees.sectorId, sectors.id)).where(
    and(
      eq(employeeSessions.tokenHash, hashSessionToken(token)),
      isNull(employeeSessions.revokedAt),
      gt(employeeSessions.expiresAt, /* @__PURE__ */ new Date()),
      eq(employees.active, true)
    )
  ).limit(1))[0];
  return row ? toEmployeeView(row.employee, row.sectorName) : null;
}
async function revokeEmployeeSession(token) {
  if (!token) return;
  const db = await requireDb();
  await db.update(employeeSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and(eq(employeeSessions.tokenHash, hashSessionToken(token)), isNull(employeeSessions.revokedAt)));
}
async function getEmployeeToday(employeeId) {
  const db = await requireDb();
  const businessDate = getBusinessDate();
  const records = await db.select({ id: timeRecords.id, type: timeRecords.type, recordedAt: timeRecords.recordedAt, latitude: timeRecords.latitude, longitude: timeRecords.longitude }).from(timeRecords).where(and(eq(timeRecords.employeeId, employeeId), eq(timeRecords.businessDate, businessDate))).orderBy(asc(timeRecords.recordedAt));
  return { businessDate, records, summary: calculateAttendance(records) };
}
async function registerEmployeePunch(employeeId, location) {
  const db = await requireDb();
  const now = /* @__PURE__ */ new Date();
  const businessDate = getBusinessDate(now);
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180) {
    throw new Error("A coordenada geogr\xE1fica \xE9 obrigat\xF3ria e inv\xE1lida. A batida n\xE3o foi registrada.");
  }
  return db.transaction(async (tx) => {
    await tx.insert(workdays).values({ employeeId, businessDate, status: "OPEN" }).onConflictDoUpdate({ target: [workdays.employeeId, workdays.businessDate], set: { updatedAt: now } });
    const workday = (await tx.select().from(workdays).where(and(eq(workdays.employeeId, employeeId), eq(workdays.businessDate, businessDate))).limit(1))[0];
    if (!workday) throw new Error("N\xE3o foi poss\xEDvel inicializar a jornada.");
    const existing = await tx.select({ type: timeRecords.type, recordedAt: timeRecords.recordedAt }).from(timeRecords).where(eq(timeRecords.workdayId, workday.id)).orderBy(asc(timeRecords.recordedAt));
    const expected = getNextPunchType(existing);
    if (!expected || workday.status === "COMPLETE") {
      throw new Error("A jornada de hoje j\xE1 est\xE1 encerrada ou possui uma sequ\xEAncia inv\xE1lida.");
    }
    await tx.insert(timeRecords).values({
      workdayId: workday.id,
      employeeId,
      businessDate,
      type: expected,
      recordedAt: now,
      latitude: location.latitude,
      longitude: location.longitude
    });
    if (expected === "SAIDA_FINAL") {
      await tx.update(workdays).set({ status: "COMPLETE", updatedAt: now }).where(eq(workdays.id, workday.id));
    }
    const records = [...existing, { type: expected, recordedAt: now }];
    return { businessDate, recordedType: expected, records, summary: calculateAttendance(records, now) };
  });
}
async function listSectors() {
  const db = await requireDb();
  return db.select().from(sectors).orderBy(asc(sectors.name));
}
async function createSector(name) {
  const db = await requireDb();
  const result = await db.insert(sectors).values({ name: name.trim() }).returning({ id: sectors.id });
  return result[0].id;
}
async function updateSector(sectorId, input) {
  const db = await requireDb();
  await db.update(sectors).set({ name: input.name.trim(), active: input.active }).where(eq(sectors.id, sectorId));
}
async function listEmployees() {
  const db = await requireDb();
  const rows = await db.select({ employee: employees, sectorName: sectors.name }).from(employees).leftJoin(sectors, eq(employees.sectorId, sectors.id)).orderBy(asc(employees.fullName));
  return rows.map((row) => toEmployeeView(row.employee, row.sectorName));
}
async function createEmployee(input) {
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
    passwordHash
  }).returning({ id: employees.id });
  return result[0].id;
}
async function updateEmployee(employeeId, input) {
  const db = await requireDb();
  await db.update(employees).set({
    fullName: input.fullName.trim(),
    registration: input.registration.trim(),
    sectorId: input.sectorId ?? null,
    funcao: input.funcao?.trim() || null,
    cargo: input.cargo?.trim() || null,
    lotacaoLocal: input.lotacaoLocal?.trim() || null,
    cargaHoraria: input.cargaHoraria?.trim() || null,
    active: input.active
  }).where(eq(employees.id, employeeId));
  if (!input.active) {
    await db.update(employeeSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq(employeeSessions.employeeId, employeeId));
  }
}
async function resetEmployeePassword(employeeId, password) {
  const db = await requireDb();
  await db.update(employees).set({ passwordHash: await hashPassword(password), passwordFailures: 0, lockedUntil: null }).where(eq(employees.id, employeeId));
  await db.update(employeeSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq(employeeSessions.employeeId, employeeId));
}
async function changeOwnAdminPassword(adminId, password) {
  const db = await requireDb();
  await db.update(users).set({ passwordHash: await hashPassword(password), passwordFailures: 0, lockedUntil: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, adminId));
  await db.update(userSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq(userSessions.userId, adminId));
}
async function getAdminDashboard(businessDate = getBusinessDate()) {
  const db = await requireDb();
  const employeeRows = await db.select({ employee: employees, sectorName: sectors.name }).from(employees).leftJoin(sectors, eq(employees.sectorId, sectors.id)).where(eq(employees.active, true)).orderBy(asc(employees.fullName));
  const records = await db.select({ employeeId: timeRecords.employeeId, type: timeRecords.type, recordedAt: timeRecords.recordedAt, latitude: timeRecords.latitude, longitude: timeRecords.longitude }).from(timeRecords).where(eq(timeRecords.businessDate, businessDate)).orderBy(asc(timeRecords.recordedAt));
  const byEmployee = /* @__PURE__ */ new Map();
  records.forEach((record) => byEmployee.set(record.employeeId, [...byEmployee.get(record.employeeId) ?? [], record]));
  return {
    businessDate,
    rows: employeeRows.map(({ employee, sectorName }) => {
      const employeeRecords = byEmployee.get(employee.id) ?? [];
      return { employee: toEmployeeView(employee, sectorName), records: employeeRecords, summary: calculateAttendance(employeeRecords) };
    })
  };
}
async function getAttendanceReport(input) {
  const db = await requireDb();
  const conditions = [gte(timeRecords.businessDate, input.startDate), lte(timeRecords.businessDate, input.endDate)];
  if (input.employeeId) conditions.push(eq(timeRecords.employeeId, input.employeeId));
  const records = await db.select({ employeeId: timeRecords.employeeId, businessDate: timeRecords.businessDate, type: timeRecords.type, recordedAt: timeRecords.recordedAt }).from(timeRecords).where(and(...conditions)).orderBy(desc(timeRecords.businessDate), asc(timeRecords.recordedAt));
  const employeeIds = Array.from(new Set(records.map((record) => record.employeeId)));
  const roster = employeeIds.length ? await db.select().from(employees).where(input.employeeId ? eq(employees.id, input.employeeId) : void 0) : [];
  const employeesById = new Map(roster.map((employee) => [employee.id, employee]));
  const grouped = /* @__PURE__ */ new Map();
  records.forEach((record) => {
    const key = `${record.employeeId}|${record.businessDate}`;
    grouped.set(key, [...grouped.get(key) ?? [], record]);
  });
  return Array.from(grouped.entries()).map(([key, dayRecords]) => {
    const [employeeIdText, businessDate] = key.split("|");
    const employee = employeesById.get(Number(employeeIdText));
    return {
      businessDate,
      employee: employee ? toEmployeeView(employee) : null,
      records: dayRecords,
      summary: calculateAttendance(dayRecords, /* @__PURE__ */ new Date(), false)
    };
  });
}
async function listHolidays() {
  const db = await requireDb();
  return db.select().from(holidays).orderBy(asc(holidays.date));
}
async function addHoliday(date, description) {
  const db = await requireDb();
  await db.insert(holidays).values({ date, description: description?.trim() || null }).onConflictDoUpdate({ target: holidays.date, set: { description: description?.trim() || null } });
}
async function removeHoliday(date) {
  const db = await requireDb();
  await db.delete(holidays).where(eq(holidays.date, date));
}
async function getMonthlyReport(input) {
  const db = await requireDb();
  const employeeRow = (await db.select({ employee: employees, sectorName: sectors.name }).from(employees).leftJoin(sectors, eq(employees.sectorId, sectors.id)).where(eq(employees.id, input.employeeId)).limit(1))[0];
  if (!employeeRow) return null;
  const startDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
  const monthEnd = new Date(input.year, input.month, 0);
  const endDate = `${input.year}-${String(input.month).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;
  const records = await db.select({
    businessDate: timeRecords.businessDate,
    type: timeRecords.type,
    recordedAt: timeRecords.recordedAt,
    latitude: timeRecords.latitude,
    longitude: timeRecords.longitude
  }).from(timeRecords).where(
    and(
      eq(timeRecords.employeeId, input.employeeId),
      gte(timeRecords.businessDate, startDate),
      lte(timeRecords.businessDate, endDate)
    )
  ).orderBy(asc(timeRecords.businessDate), asc(timeRecords.recordedAt));
  const daysInMonth = monthEnd.getDate();
  const dayRecords = {};
  records.forEach((record) => {
    const day = Number(record.businessDate.slice(8, 10));
    dayRecords[day] = [...dayRecords[day] ?? [], { type: record.type, recordedAt: record.recordedAt, latitude: record.latitude, longitude: record.longitude }];
  });
  return {
    employee: toReportEmployeeView(employeeRow.employee, employeeRow.sectorName),
    month: input.month,
    year: input.year,
    startDate,
    endDate,
    days: Array.from({ length: daysInMonth }, (_, index2) => index2 + 1).map((day) => ({
      day,
      records: dayRecords[day] ?? []
    }))
  };
}
async function listReportLogs(limit = 50) {
  const db = await requireDb();
  return db.select({
    id: reportLogs.id,
    employeeId: reportLogs.employeeId,
    month: reportLogs.month,
    year: reportLogs.year,
    issuedBy: reportLogs.issuedBy,
    issuedAt: reportLogs.issuedAt,
    fileName: reportLogs.fileName,
    employeeName: employees.fullName,
    registration: employees.registration,
    lotacaoLocal: employees.lotacaoLocal
  }).from(reportLogs).leftJoin(employees, eq(reportLogs.employeeId, employees.id)).orderBy(desc(reportLogs.issuedAt)).limit(limit);
}
async function logReport(input) {
  const db = await requireDb();
  await db.insert(reportLogs).values({
    employeeId: input.employeeId,
    month: input.month,
    year: input.year,
    issuedBy: input.issuedBy ?? null,
    fileName: input.fileName ?? null
  });
}

// server/_core/cookies.ts
var ADMIN_SESSION_COOKIE = "ponto_admin_session";
var ADMIN_SESSION_LIFETIME_MS = 12 * 60 * 60 * 1e3;
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var EMPLOYEE_COOKIE = "ponto_employee_session";
var passwordSchema = z2.string().min(8, "A senha deve conter ao menos 8 caracteres.").max(128);
var employeePasswordSchema = z2.string().min(4, "A senha deve conter ao menos 4 caracteres.").max(128, "A senha deve conter no m\xE1ximo 128 caracteres.").refine((value) => value.length >= 8 || /^\d+$/.test(value), "Use ao menos 8 caracteres, ou uma sequ\xEAncia de n\xFAmeros com no m\xEDnimo 4.");
var dateSchema = z2.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data v\xE1lida.");
function toClientUser(user) {
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
    role: user.role
  };
}
function getCookieValue(cookieHeader, name) {
  const prefix = `${name}=`;
  const found = cookieHeader?.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : null;
}
function getEmployeeToken(cookieHeader) {
  return getCookieValue(cookieHeader, EMPLOYEE_COOKIE);
}
function employeeCookieOptions(req) {
  const forwarded = req.headers["x-forwarded-proto"];
  const secure = req.protocol === "https" || forwarded === "https" || Array.isArray(forwarded) && forwarded[0] === "https";
  return { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 12 * 60 * 60 * 1e3 };
}
function getAdminToken(cookieHeader) {
  return getCookieValue(cookieHeader, ADMIN_SESSION_COOKIE);
}
function adminCookieOptions(req) {
  const forwarded = req.headers["x-forwarded-proto"];
  const secure = req.protocol === "https" || forwarded === "https" || Array.isArray(forwarded) && forwarded[0] === "https";
  return { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: ADMIN_SESSION_LIFETIME_MS };
}
async function requireEmployee(cookieHeader) {
  const employee = await getEmployeeSession(getEmployeeToken(cookieHeader));
  if (!employee) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Sua sess\xE3o expirou. Acesse novamente." });
  return employee;
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user ? toClientUser(opts.ctx.user) : null),
    login: publicProcedure.input(z2.object({ login: z2.string().trim().min(2).max(180), password: passwordSchema })).mutation(async ({ ctx, input }) => {
      const admin = await loginAdmin(input.login, input.password);
      if (!admin) throw new TRPCError3({ code: "UNAUTHORIZED", message: "N\xE3o foi poss\xEDvel validar as credenciais administrativas." });
      ctx.res.cookie(ADMIN_SESSION_COOKIE, admin.token, adminCookieOptions(ctx.req));
      return { success: true };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await revokeUserSession(getAdminToken(ctx.req.headers.cookie));
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { ...adminCookieOptions(ctx.req), maxAge: -1 });
      return { success: true };
    })
  }),
  employee: router({
    listForLogin: publicProcedure.query(() => listActiveEmployeesForLogin()),
    login: publicProcedure.input(z2.object({ employeeId: z2.number().int().positive(), password: employeePasswordSchema })).mutation(async ({ ctx, input }) => {
      const login = await loginEmployee(input.employeeId, input.password);
      if (!login) throw new TRPCError3({ code: "UNAUTHORIZED", message: "N\xE3o foi poss\xEDvel validar as credenciais informadas." });
      ctx.res.cookie(EMPLOYEE_COOKIE, login.token, employeeCookieOptions(ctx.req));
      return { success: true };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await revokeEmployeeSession(getEmployeeToken(ctx.req.headers.cookie));
      ctx.res.clearCookie(EMPLOYEE_COOKIE, employeeCookieOptions(ctx.req));
      return { success: true };
    }),
    me: publicProcedure.query(async ({ ctx }) => getEmployeeSession(getEmployeeToken(ctx.req.headers.cookie)))
  }),
  attendance: router({
    today: publicProcedure.query(async ({ ctx }) => {
      const employee = await requireEmployee(ctx.req.headers.cookie);
      return getEmployeeToday(employee.id);
    }),
    punch: publicProcedure.input(z2.object({
      latitude: z2.number().min(-90).max(90),
      longitude: z2.number().min(-180).max(180)
    })).mutation(async ({ ctx, input }) => {
      const employee = await requireEmployee(ctx.req.headers.cookie);
      return registerEmployeePunch(employee.id, input);
    })
  }),
  admin: router({
    dashboard: adminProcedure.input(z2.object({ businessDate: dateSchema.optional() })).query(({ input }) => getAdminDashboard(input.businessDate)),
    employees: adminProcedure.query(() => listEmployees()),
    sectors: adminProcedure.query(() => listSectors()),
    createSector: adminProcedure.input(z2.object({ name: z2.string().trim().min(2).max(120) })).mutation(({ input }) => createSector(input.name)),
    updateSector: adminProcedure.input(z2.object({ sectorId: z2.number().int().positive(), name: z2.string().trim().min(2).max(120), active: z2.boolean() })).mutation(({ input }) => updateSector(input.sectorId, input)),
    createEmployee: adminProcedure.input(z2.object({
      fullName: z2.string().trim().min(3).max(180),
      registration: z2.string().trim().min(2).max(64),
      sectorId: z2.number().int().positive().nullable().optional(),
      funcao: z2.string().trim().max(180).nullable().optional(),
      cargo: z2.string().trim().max(180).nullable().optional(),
      lotacaoLocal: z2.string().trim().max(180).nullable().optional(),
      cargaHoraria: z2.string().trim().max(20).nullable().optional(),
      password: employeePasswordSchema
    })).mutation(({ input }) => createEmployee(input)),
    updateEmployee: adminProcedure.input(z2.object({
      employeeId: z2.number().int().positive(),
      fullName: z2.string().trim().min(3).max(180),
      registration: z2.string().trim().min(2).max(64),
      sectorId: z2.number().int().positive().nullable().optional(),
      funcao: z2.string().trim().max(180).nullable().optional(),
      cargo: z2.string().trim().max(180).nullable().optional(),
      lotacaoLocal: z2.string().trim().max(180).nullable().optional(),
      cargaHoraria: z2.string().trim().max(20).nullable().optional(),
      active: z2.boolean()
    })).mutation(({ input }) => updateEmployee(input.employeeId, input)),
    resetPassword: adminProcedure.input(z2.object({ employeeId: z2.number().int().positive(), password: employeePasswordSchema })).mutation(({ input }) => resetEmployeePassword(input.employeeId, input.password)),
    changeOwnPassword: adminProcedure.input(z2.object({ password: passwordSchema })).mutation(async ({ ctx, input }) => {
      await changeOwnAdminPassword(ctx.user.id, input.password);
      return { success: true };
    }),
    report: adminProcedure.input(z2.object({ startDate: dateSchema, endDate: dateSchema, employeeId: z2.number().int().positive().optional() })).query(({ input }) => {
      if (input.startDate > input.endDate) throw new TRPCError3({ code: "BAD_REQUEST", message: "O per\xEDodo informado \xE9 inv\xE1lido." });
      return getAttendanceReport(input);
    }),
    monthlyReport: adminProcedure.input(z2.object({ employeeId: z2.number().int().positive(), month: z2.number().int().min(1).max(12), year: z2.number().int().min(2e3).max(2100) })).query(({ input }) => getMonthlyReport(input)),
    holidays: adminProcedure.query(() => listHolidays()),
    addHoliday: adminProcedure.input(z2.object({ date: dateSchema, description: z2.string().trim().max(180).optional() })).mutation(({ input }) => addHoliday(input.date, input.description)),
    removeHoliday: adminProcedure.input(z2.object({ date: dateSchema })).mutation(({ input }) => removeHoliday(input.date)),
    reportLogs: adminProcedure.query(() => listReportLogs()),
    logReport: adminProcedure.input(z2.object({ employeeId: z2.number().int().positive(), month: z2.number().int().min(1).max(12), year: z2.number().int().min(2e3).max(2100), issuedBy: z2.string().trim().max(180).nullable().optional(), fileName: z2.string().trim().max(255).nullable().optional() })).mutation(({ input }) => logReport(input))
  })
});

// server/_core/context.ts
import { parse as parseCookieHeader2 } from "cookie";

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  if (!user) {
    const adminToken = parseCookieHeader2(opts.req.headers.cookie ?? "")[ADMIN_SESSION_COOKIE];
    if (adminToken) {
      user = await getUserSession(adminToken);
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/oauth.ts
import { parse as parseCookieHeader3 } from "cookie";
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader3(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/app.ts
function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app;
}

// server/_core/vercel.ts
var vercel_default = createApp();
export {
  vercel_default as default
};
