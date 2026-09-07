CREATE TYPE "public"."role" AS ENUM('user', 'admin');
--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('OPEN', 'COMPLETE');
--> statement-breakpoint
CREATE TYPE "public"."time_record_type" AS ENUM('ENTRADA', 'SAIDA_INTERVALO', 'RETORNO_INTERVALO', 'SAIDA_FINAL');
--> statement-breakpoint
CREATE TABLE "employee_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"tokenHash" varchar(64) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"revokedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"fullName" varchar(180) NOT NULL,
	"registration" varchar(64) NOT NULL,
	"sectorId" integer,
	"passwordHash" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"passwordFailures" integer DEFAULT 0 NOT NULL,
	"lockedUntil" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"workdayId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"businessDate" varchar(10) NOT NULL,
	"type" time_record_type NOT NULL,
	"recordedAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "workdays" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"businessDate" varchar(10) NOT NULL,
	"status" "status" DEFAULT 'OPEN' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_sessions" ADD CONSTRAINT "employee_sessions_employeeId_employees_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_sectorId_sectors_id_fk" FOREIGN KEY ("sectorId") REFERENCES "public"."sectors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_records" ADD CONSTRAINT "time_records_workdayId_workdays_id_fk" FOREIGN KEY ("workdayId") REFERENCES "public"."workdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_records" ADD CONSTRAINT "time_records_employeeId_employees_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workdays" ADD CONSTRAINT "workdays_employeeId_employees_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employee_sessions_token_unique" ON "employee_sessions" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "employee_sessions_employee_idx" ON "employee_sessions" USING btree ("employeeId");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_registration_unique" ON "employees" USING btree ("registration");--> statement-breakpoint
CREATE INDEX "employees_sector_idx" ON "employees" USING btree ("sectorId");--> statement-breakpoint
CREATE INDEX "employees_active_idx" ON "employees" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "sectors_name_unique" ON "sectors" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "time_records_workday_type_unique" ON "time_records" USING btree ("workdayId","type");--> statement-breakpoint
CREATE INDEX "time_records_employee_date_idx" ON "time_records" USING btree ("employeeId","businessDate");--> statement-breakpoint
CREATE INDEX "time_records_date_idx" ON "time_records" USING btree ("businessDate");--> statement-breakpoint
CREATE UNIQUE INDEX "workdays_employee_date_unique" ON "workdays" USING btree ("employeeId","businessDate");--> statement-breakpoint
CREATE INDEX "workdays_date_idx" ON "workdays" USING btree ("businessDate");