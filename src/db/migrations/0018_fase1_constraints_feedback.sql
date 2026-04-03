-- Migracion 0018: cierre Fase 1 + integridad de entregas/reportes

BEGIN;

-- Backfill defensivo para alumnos sin estado explicito
UPDATE "usuarios"
SET "estado_alumno" = 'activo'
WHERE "rol" = 'alumno' AND "activo" = true AND "estado_alumno" IS NULL;

UPDATE "usuarios"
SET "estado_alumno" = 'retirado'
WHERE "rol" = 'alumno' AND "activo" = false AND "estado_alumno" IS NULL;

-- Asegurar curso_id para filas legacy de asignaturas
INSERT INTO "cursos" ("nombre", "codigo", "created_at", "updated_at")
SELECT DISTINCT
  a."nombre",
  'LEGACY-' || UPPER(SUBSTRING(MD5(a."nombre"), 1, 10)),
  NOW(),
  NOW()
FROM "asignaturas" a
WHERE a."curso_id" IS NULL
ON CONFLICT ("codigo") DO NOTHING;

UPDATE "asignaturas" a
SET "curso_id" = c."id"
FROM "cursos" c
WHERE a."curso_id" IS NULL
  AND LOWER(a."nombre") = LOWER(c."nombre");

WITH missing AS (
  SELECT a."id"
  FROM "asignaturas" a
  WHERE a."curso_id" IS NULL
), created AS (
  INSERT INTO "cursos" ("nombre", "codigo", "created_at", "updated_at")
  SELECT
    a."nombre",
    'LEGACY-' || UPPER(SUBSTRING(MD5(a."id"::text), 1, 10)),
    NOW(),
    NOW()
  FROM "asignaturas" a
  INNER JOIN missing m ON m."id" = a."id"
  ON CONFLICT ("codigo") DO NOTHING
  RETURNING "id", "codigo"
)
SELECT 1 FROM created;

UPDATE "asignaturas" a
SET "curso_id" = c."id"
FROM "cursos" c
WHERE a."curso_id" IS NULL
  AND c."codigo" = 'LEGACY-' || UPPER(SUBSTRING(MD5(a."id"::text), 1, 10));

-- Asegurar periodo_id para filas legacy segun fecha_inicio
WITH derived AS (
  SELECT DISTINCT
    EXTRACT(YEAR FROM a."fecha_inicio")::int AS year_num,
    CASE WHEN EXTRACT(MONTH FROM a."fecha_inicio")::int <= 6 THEN 1 ELSE 2 END AS sem_num
  FROM "asignaturas" a
  WHERE a."periodo_id" IS NULL
), inserted AS (
  INSERT INTO "periodos_academicos" (
    "codigo",
    "nombre",
    "fecha_inicio",
    "fecha_fin",
    "estado",
    "created_at",
    "updated_at"
  )
  SELECT
    year_num::text || '-S' || sem_num::text AS codigo,
    'Semestre ' || sem_num::text || ' ' || year_num::text AS nombre,
    MAKE_DATE(year_num, CASE WHEN sem_num = 1 THEN 1 ELSE 7 END, 1) AS fecha_inicio,
    MAKE_DATE(year_num, CASE WHEN sem_num = 1 THEN 6 ELSE 12 END, CASE WHEN sem_num = 1 THEN 30 ELSE 31 END) AS fecha_fin,
    (
      CASE
        WHEN CURRENT_DATE < MAKE_DATE(year_num, CASE WHEN sem_num = 1 THEN 1 ELSE 7 END, 1) THEN 'planificado'
        WHEN CURRENT_DATE > MAKE_DATE(year_num, CASE WHEN sem_num = 1 THEN 6 ELSE 12 END, CASE WHEN sem_num = 1 THEN 30 ELSE 31 END) THEN 'cerrado'
        ELSE 'activo'
      END
    )::"estado_periodo",
    NOW(),
    NOW()
  FROM derived
  ON CONFLICT ("codigo") DO NOTHING
  RETURNING "id"
)
SELECT 1 FROM inserted;

UPDATE "asignaturas" a
SET "periodo_id" = p."id"
FROM "periodos_academicos" p
WHERE a."periodo_id" IS NULL
  AND p."codigo" = EXTRACT(YEAR FROM a."fecha_inicio")::int::text
    || '-S'
    || CASE WHEN EXTRACT(MONTH FROM a."fecha_inicio")::int <= 6 THEN '1' ELSE '2' END;

-- Backfill fecha_fin si faltaba
UPDATE "asignaturas"
SET "fecha_fin" = ("fecha_inicio"::date + ("duracion_meses" || ' months')::interval)::date
WHERE "fecha_fin" IS NULL;

-- Derivar turno para filas sin turno
UPDATE "asignaturas" a
SET "turno" = COALESCE(
  (
    SELECT
      CASE
        WHEN MIN(c."hora_inicio") < TIME '12:00' THEN 'manana'::"turno"
        WHEN MIN(c."hora_inicio") < TIME '18:00' THEN 'tarde'::"turno"
        ELSE 'vespertino'::"turno"
      END
    FROM "clases" c
    WHERE c."asignatura_id" = a."id"
      AND c."eliminado_at" IS NULL
      AND c."hora_inicio" IS NOT NULL
  ),
  'manana'::"turno"
)
WHERE a."turno" IS NULL;

-- Normalizar turnos por curso+periodo para acercarse al modelo 1 curso / 3 turnos maximo
WITH ranked AS (
  SELECT
    a."id",
    ROW_NUMBER() OVER (
      PARTITION BY a."curso_id", a."periodo_id"
      ORDER BY a."created_at" NULLS LAST, a."id"
    ) AS rn
  FROM "asignaturas" a
  WHERE a."eliminado_at" IS NULL
)
UPDATE "asignaturas" a
SET "turno" = CASE ((r.rn - 1) % 3)
  WHEN 0 THEN 'manana'::"turno"
  WHEN 1 THEN 'tarde'::"turno"
  ELSE 'vespertino'::"turno"
END
FROM ranked r
WHERE a."id" = r."id";

-- Guard-rail: no se puede aplicar unique(curso,periodo,turno) si hay mas de 3 secciones activas para mismo curso+periodo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "asignaturas" a
    WHERE a."eliminado_at" IS NULL
    GROUP BY a."curso_id", a."periodo_id"
    HAVING COUNT(*) > 3
  ) THEN
    RAISE EXCEPTION 'No se puede cerrar Fase 1: existen curso+periodo con mas de 3 secciones activas.';
  END IF;
END $$;

ALTER TABLE "asignaturas" ALTER COLUMN "curso_id" SET NOT NULL;
ALTER TABLE "asignaturas" ALTER COLUMN "turno" SET NOT NULL;
ALTER TABLE "asignaturas" ALTER COLUMN "periodo_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'asignaturas_curso_periodo_turno_uniq'
  ) THEN
    ALTER TABLE "asignaturas"
      ADD CONSTRAINT "asignaturas_curso_periodo_turno_uniq"
      UNIQUE ("curso_id", "periodo_id", "turno");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notas_entrega_id_fk'
  ) THEN
    ALTER TABLE "notas"
      ADD CONSTRAINT "notas_entrega_id_fk"
      FOREIGN KEY ("entrega_id")
      REFERENCES "entregas"("id");
  END IF;
END $$;

COMMIT;
