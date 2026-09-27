ALTER TABLE "employees" ADD COLUMN "cargaHorariaSemanal" integer DEFAULT 40 NOT NULL;--> statement-breakpoint
UPDATE "employees" SET "cargaHorariaSemanal" = CASE
  WHEN (regexp_match(btrim("cargaHoraria"), '^([0-9]{1,2})'))[1]::integer * 5 BETWEEN 4 AND 60
    THEN (regexp_match(btrim("cargaHoraria"), '^([0-9]{1,2})'))[1]::integer * 5
  ELSE 40
END;
