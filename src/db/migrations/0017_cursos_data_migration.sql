-- Migración 0017: Migración de datos - crear cursos desde asignaturas existentes
-- Cada nombre único de asignatura se convierte en un curso template.

INSERT INTO "cursos" ("nombre", "codigo", "created_at", "updated_at")
SELECT DISTINCT ON (nombre)
  nombre,
  COALESCE(
    codigo,
    UPPER(REGEXP_REPLACE(SUBSTRING(nombre, 1, 8), '[^A-Za-z0-9]', '', 'g'))
      || '-' || EXTRACT(YEAR FROM created_at)::text
      || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY LOWER(nombre) ORDER BY created_at)::text, 3, '0')
  ),
  created_at,
  updated_at
FROM "asignaturas"
WHERE "eliminado_at" IS NULL
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint

-- Vincular asignaturas a sus cursos correspondientes por nombre
UPDATE "asignaturas" a
SET "curso_id" = c.id
FROM "cursos" c
WHERE LOWER(a.nombre) = LOWER(c.nombre)
  AND a.curso_id IS NULL;
--> statement-breakpoint

-- Calcular fecha_fin desde fecha_inicio + duracion_meses donde no esté definida
UPDATE "asignaturas"
SET "fecha_fin" = (fecha_inicio::date + (duracion_meses || ' months')::interval)::date
WHERE "fecha_fin" IS NULL AND "fecha_inicio" IS NOT NULL AND "duracion_meses" > 0;
