import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  createEmployee,
  createSector,
  getAdminDashboard,
  getAttendanceReport,
  getEmployeeSession,
  getEmployeeToday,
  listActiveEmployeesForLogin,
  listEmployees,
  listSectors,
  loginEmployee,
  registerEmployeePunch,
  resetEmployeePassword,
  revokeEmployeeSession,
  updateSector,
  updateEmployee,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

const EMPLOYEE_COOKIE = "ponto_employee_session";
const passwordSchema = z.string().min(8, "A senha deve conter ao menos 8 caracteres.").max(128);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");

function getCookieValue(cookieHeader: string | undefined, name: string): string | null {
  const prefix = `${name}=`;
  const found = cookieHeader?.split(";").map(item => item.trim()).find(item => item.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : null;
}

function getEmployeeToken(cookieHeader: string | undefined) {
  return getCookieValue(cookieHeader, EMPLOYEE_COOKIE);
}

function employeeCookieOptions(req: { protocol?: string; headers: Record<string, string | string[] | undefined> }) {
  const forwarded = req.headers["x-forwarded-proto"];
  const secure = req.protocol === "https" || forwarded === "https" || (Array.isArray(forwarded) && forwarded[0] === "https");
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 12 * 60 * 60 * 1000 };
}

async function requireEmployee(cookieHeader: string | undefined) {
  const employee = await getEmployeeSession(getEmployeeToken(cookieHeader));
  if (!employee) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sua sessão expirou. Acesse novamente." });
  return employee;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  employee: router({
    listForLogin: publicProcedure.query(() => listActiveEmployeesForLogin()),
    login: publicProcedure.input(z.object({ employeeId: z.number().int().positive(), password: passwordSchema })).mutation(async ({ ctx, input }) => {
      const login = await loginEmployee(input.employeeId, input.password);
      if (!login) throw new TRPCError({ code: "UNAUTHORIZED", message: "Não foi possível validar as credenciais informadas." });
      ctx.res.cookie(EMPLOYEE_COOKIE, login.token, employeeCookieOptions(ctx.req));
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await revokeEmployeeSession(getEmployeeToken(ctx.req.headers.cookie));
      ctx.res.clearCookie(EMPLOYEE_COOKIE, employeeCookieOptions(ctx.req));
      return { success: true } as const;
    }),
    me: publicProcedure.query(async ({ ctx }) => getEmployeeSession(getEmployeeToken(ctx.req.headers.cookie))),
  }),
  attendance: router({
    today: publicProcedure.query(async ({ ctx }) => {
      const employee = await requireEmployee(ctx.req.headers.cookie);
      return getEmployeeToday(employee.id);
    }),
    punch: publicProcedure.mutation(async ({ ctx }) => {
      const employee = await requireEmployee(ctx.req.headers.cookie);
      return registerEmployeePunch(employee.id);
    }),
  }),
  admin: router({
    dashboard: adminProcedure.input(z.object({ businessDate: dateSchema.optional() })).query(({ input }) => getAdminDashboard(input.businessDate)),
    employees: adminProcedure.query(() => listEmployees()),
    sectors: adminProcedure.query(() => listSectors()),
    createSector: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120) })).mutation(({ input }) => createSector(input.name)),
    updateSector: adminProcedure.input(z.object({ sectorId: z.number().int().positive(), name: z.string().trim().min(2).max(120), active: z.boolean() })).mutation(({ input }) => updateSector(input.sectorId, input)),
    createEmployee: adminProcedure.input(z.object({
      fullName: z.string().trim().min(3).max(180),
      registration: z.string().trim().min(2).max(64),
      sectorId: z.number().int().positive().nullable().optional(),
      password: passwordSchema,
    })).mutation(({ input }) => createEmployee(input)),
    updateEmployee: adminProcedure.input(z.object({
      employeeId: z.number().int().positive(),
      fullName: z.string().trim().min(3).max(180),
      registration: z.string().trim().min(2).max(64),
      sectorId: z.number().int().positive().nullable().optional(),
      active: z.boolean(),
    })).mutation(({ input }) => updateEmployee(input.employeeId, input)),
    resetPassword: adminProcedure.input(z.object({ employeeId: z.number().int().positive(), password: passwordSchema })).mutation(({ input }) => resetEmployeePassword(input.employeeId, input.password)),
    report: adminProcedure.input(z.object({ startDate: dateSchema, endDate: dateSchema, employeeId: z.number().int().positive().optional() })).query(({ input }) => {
      if (input.startDate > input.endDate) throw new TRPCError({ code: "BAD_REQUEST", message: "O período informado é inválido." });
      return getAttendanceReport(input);
    }),
  }),
});

export type AppRouter = typeof appRouter;
