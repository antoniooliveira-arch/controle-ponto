CREATE TABLE "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" varchar(10) NOT NULL,
	"description" varchar(180),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"issuedBy" varchar(180),
	"issuedAt" timestamp DEFAULT now() NOT NULL,
	"fileName" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "funcao" varchar(180);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "cargo" varchar(180);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "lotacaoLocal" varchar(180);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "cargaHoraria" varchar(20) DEFAULT '8h';--> statement-breakpoint
ALTER TABLE "report_logs" ADD CONSTRAINT "report_logs_employeeId_employees_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "holidays_date_unique" ON "holidays" USING btree ("date");--> statement-breakpoint
CREATE INDEX "report_logs_employee_month_year_idx" ON "report_logs" USING btree ("employeeId","month","year");