import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const roleEnum = pgEnum("role", ["user", "admin"]);
const statusEnum = pgEnum("status", ["OPEN", "COMPLETE"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const sectors = pgTable(
  "sectors",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("sectors_name_unique").on(table.name)],
);

export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    fullName: varchar("fullName", { length: 180 }).notNull(),
    registration: varchar("registration", { length: 64 }).notNull(),
    sectorId: integer("sectorId").references(() => sectors.id, { onDelete: "set null" }),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    active: boolean("active").default(true).notNull(),
    passwordFailures: integer("passwordFailures").default(0).notNull(),
    lockedUntil: timestamp("lockedUntil"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("employees_registration_unique").on(table.registration),
    index("employees_sector_idx").on(table.sectorId),
    index("employees_active_idx").on(table.active),
  ],
);

export const employeeSessions = pgTable(
  "employee_sessions",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("employee_sessions_token_unique").on(table.tokenHash),
    index("employee_sessions_employee_idx").on(table.employeeId),
  ],
);

export const workdays = pgTable(
  "workdays",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    businessDate: varchar("businessDate", { length: 10 }).notNull(),
    status: statusEnum("status").default("OPEN").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("workdays_employee_date_unique").on(table.employeeId, table.businessDate),
    index("workdays_date_idx").on(table.businessDate),
  ],
);

export const timeRecordType = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA_FINAL",
] as const;

const timeRecordTypeEnum = pgEnum("time_record_type", timeRecordType);

export const timeRecords = pgTable(
  "time_records",
  {
    id: serial("id").primaryKey(),
    workdayId: integer("workdayId").notNull().references(() => workdays.id, { onDelete: "cascade" }),
    employeeId: integer("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    businessDate: varchar("businessDate", { length: 10 }).notNull(),
    type: timeRecordTypeEnum("type").notNull(),
    recordedAt: timestamp("recordedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("time_records_workday_type_unique").on(table.workdayId, table.type),
    index("time_records_employee_date_idx").on(table.employeeId, table.businessDate),
    index("time_records_date_idx").on(table.businessDate),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type TimeRecord = typeof timeRecords.$inferSelect;