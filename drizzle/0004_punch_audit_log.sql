CREATE TYPE "public"."punch_audit_action" AS ENUM('INSERT', 'UPDATE', 'DELETE');
--> statement-breakpoint
CREATE TABLE "punch_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer,
	"employeeName" varchar(180) NOT NULL,
	"registration" varchar(64),
	"workdayId" integer,
	"businessDate" varchar(10) NOT NULL,
	"action" "punch_audit_action" NOT NULL,
	"punchType" time_record_type NOT NULL,
	"previousRecordedAt" timestamp,
	"newRecordedAt" timestamp,
	"reason" varchar(400) NOT NULL,
	"notes" text,
	"adjustedById" integer,
	"adjustedBy" varchar(180) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "punch_audit_log" ADD CONSTRAINT "punch_audit_log_employeeId_employees_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_audit_log" ADD CONSTRAINT "punch_audit_log_workdayId_workdays_id_fk" FOREIGN KEY ("workdayId") REFERENCES "public"."workdays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_audit_log" ADD CONSTRAINT "punch_audit_log_adjustedById_users_id_fk" FOREIGN KEY ("adjustedById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "punch_audit_log_employee_date_idx" ON "punch_audit_log" USING btree ("employeeId","businessDate");--> statement-breakpoint
CREATE INDEX "punch_audit_log_created_at_idx" ON "punch_audit_log" USING btree ("createdAt");