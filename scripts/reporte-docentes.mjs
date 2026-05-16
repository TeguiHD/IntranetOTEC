/**
 * reporte-docentes.mjs
 *
 * Reporta estado de docentes vs asignaciones. NO modifica datos.
 *
 * Necesario porque el Excel "Listado Mayo - Junio (1).xlsx" no incluye columna
 * docente — el cliente debe asignar manualmente desde /admin/asignaturas.
 * Este script genera el inventario para tomar esas decisiones sin perder docentes activos.
 *
 * Salidas:
 *   - backups/docentes-activos-<fecha>.csv  : docentes activos + asignaturas vigentes
 *   - backups/asignaturas-sin-docente-<fecha>.csv : secciones sin docenteId en periodo activo
 *
 * Run:
 *   node scripts/reporte-docentes.mjs
 */

import pg from "pg";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://otec:otec@127.0.0.1:5433/otec_db";

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });

const csvEscape = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (rows) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  return lines.join("\n");
};

async function main() {
  const client = await pool.connect();
  try {
    const { rows: docentes } = await client.query(
      `SELECT u.id, u.rut, u.nombre, u.apellido, u.activo, u.eliminado_at,
              COUNT(a.id) FILTER (WHERE a.eliminado_at IS NULL) AS asignaturas_activas,
              STRING_AGG(DISTINCT c.nombre, ' | ') FILTER (WHERE a.eliminado_at IS NULL) AS cursos
       FROM usuarios u
       LEFT JOIN asignaturas a ON a.docente_id = u.id
       LEFT JOIN cursos c ON c.id = a.curso_id AND c.eliminado_at IS NULL
       WHERE u.rol = 'docente' AND u.eliminado_at IS NULL
       GROUP BY u.id
       ORDER BY u.apellido, u.nombre`,
    );

    const { rows: sinDocente } = await client.query(
      `SELECT a.id AS asignatura_id, a.nombre AS asignatura, a.turno,
              c.nombre AS curso, c.codigo AS curso_codigo,
              p.codigo AS periodo, p.nombre AS periodo_nombre
       FROM asignaturas a
       INNER JOIN cursos c ON c.id = a.curso_id
       INNER JOIN periodos_academicos p ON p.id = a.periodo_id
       WHERE a.eliminado_at IS NULL
         AND a.docente_id IS NULL
         AND p.eliminado_at IS NULL
       ORDER BY p.fecha_inicio DESC, c.nombre, a.turno`,
    );

    mkdirSync("backups", { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const f1 = join("backups", `docentes-activos-${stamp}.csv`);
    const f2 = join("backups", `asignaturas-sin-docente-${stamp}.csv`);
    writeFileSync(f1, toCsv(docentes));
    writeFileSync(f2, toCsv(sinDocente));

    console.log(`[reporte] docentes activos: ${docentes.length} → ${f1}`);
    console.log(`[reporte] asignaturas sin docente: ${sinDocente.length} → ${f2}`);
    console.log(
      `[reporte] Acción: revisar f2, asignar manualmente desde /admin/asignaturas. NO eliminar docentes sin uso (el cliente puede asignarlos a futuro).`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[reporte] ERROR:", err);
  process.exit(1);
});
