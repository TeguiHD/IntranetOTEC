/**
 * seed-calendario-secciones.mjs
 *
 * Para cada sección activa sin bloques horarios:
 *   1) Parsea día + hora del nombre (ej: "Aparatologia Podal Sabado 10:00")
 *   2) Crea 1 bloque horario (hora_inicio + 1h30 por defecto)
 *   3) Genera N clases semanales (8 por defecto, SESIONES env)
 *
 * Run:
 *   node scripts/seed-calendario-secciones.mjs                (dry-run)
 *   node scripts/seed-calendario-secciones.mjs --apply
 *   SESIONES=10 DURACION_MIN=120 node scripts/seed-calendario-secciones.mjs --apply
 */

import pg from "pg";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DRY_RUN = !process.argv.includes("--apply");
const SESIONES = Number(process.env.SESIONES ?? 8);
const DURACION_MIN = Number(process.env.DURACION_MIN ?? 90);
const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://otec:otec@127.0.0.1:5433/otec_db";

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });

const DIA_RX = /\b(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\b/iu;
const HORA_RX = /\b(\d{1,2})[:.](\d{2})\b/;
const DIA_MAP = {
  lunes: 0, martes: 1, miercoles: 2, "miércoles": 2, jueves: 3,
  viernes: 4, sabado: 5, "sábado": 5, domingo: 6,
};
const jsToLun = (d) => (d + 6) % 7;

function parseNombre(nombre) {
  const diaM = DIA_RX.exec(nombre);
  const horaM = HORA_RX.exec(nombre);
  if (!diaM || !horaM) return null;
  const diaSemana = DIA_MAP[diaM[1].toLowerCase()];
  if (diaSemana == null) return null;
  const h = Math.min(23, Math.max(0, Number(horaM[1])));
  const m = Math.min(59, Math.max(0, Number(horaM[2])));
  return { diaSemana, horaInicio: { h, m } };
}

function addMinutes(h, m, plus) {
  const t = h * 60 + m + plus;
  return { h: Math.floor(t / 60) % 24, m: t % 60 };
}
const pad2 = (n) => String(n).padStart(2, "0");
const fmtTime = ({ h, m }) => `${pad2(h)}:${pad2(m)}:00`;

function generarFechas(fechaInicioIso, diaSemanaLun, n) {
  const start = new Date(`${fechaInicioIso}T00:00:00`);
  const delta = (diaSemanaLun - jsToLun(start.getDay()) + 7) % 7;
  const first = new Date(start);
  first.setDate(start.getDate() + delta);
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i * 7);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const log = (...args) => console.log("[seed-cal]", ...args);
const reportRows = [];

async function main() {
  log(`MODO: ${DRY_RUN ? "DRY-RUN" : "APPLY"} | sesiones=${SESIONES} | duracion=${DURACION_MIN}min`);
  log(`DB: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  const client = await pool.connect();
  try {
    const { rows: secciones } = await client.query(`
      SELECT a.id, a.nombre, a.fecha_inicio, a.fecha_fin
      FROM asignaturas a
      WHERE a.eliminado_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM bloques_horario bh
          WHERE bh.asignatura_id = a.id AND bh.eliminado_at IS NULL
        )
      ORDER BY a.nombre
    `);
    log(`secciones sin bloques: ${secciones.length}`);
    if (!DRY_RUN) await client.query("BEGIN");
    let creados = 0;
    let saltados = 0;
    for (const s of secciones) {
      const parsed = parseNombre(s.nombre);
      if (!parsed) {
        saltados++;
        reportRows.push({ id: s.id, nombre: s.nombre, status: "skip", razon: "no parse" });
        continue;
      }
      const horaFin = addMinutes(parsed.horaInicio.h, parsed.horaInicio.m, DURACION_MIN);
      const hi = fmtTime(parsed.horaInicio);
      const hf = fmtTime(horaFin);
      const fechas = generarFechas(s.fecha_inicio, parsed.diaSemana, SESIONES);
      reportRows.push({
        id: s.id, nombre: s.nombre, status: "ok",
        dia_semana: parsed.diaSemana, hora_inicio: hi, hora_fin: hf,
        primera: fechas[0], ultima: fechas[fechas.length - 1], n_clases: fechas.length,
      });
      if (!DRY_RUN) {
        await client.query(
          `INSERT INTO bloques_horario (asignatura_id, dia_semana, hora_inicio, hora_fin) VALUES ($1,$2,$3,$4)`,
          [s.id, parsed.diaSemana, hi, hf],
        );
        for (let i = 0; i < fechas.length; i++) {
          await client.query(
            `INSERT INTO clases (asignatura_id, titulo, numero_sesion, fecha, hora_inicio, hora_fin, publicada)
             VALUES ($1,$2,$3,$4,$5,$6,false)`,
            [s.id, `Sesion ${i + 1}`, i + 1, fechas[i], hi, hf],
          );
        }
        creados++;
      }
    }
    if (!DRY_RUN) {
      await client.query("COMMIT");
      log(`OK COMMIT — procesadas: ${creados}, saltadas: ${saltados}`);
    } else {
      log(`OK DRY-RUN — procesadas: ${secciones.length - saltados}, saltadas: ${saltados}`);
    }
  } catch (err) {
    if (!DRY_RUN) await client.query("ROLLBACK").catch(() => {});
    console.error("[seed-cal] ERROR:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
  if (reportRows.length > 0) {
    mkdirSync("backups", { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const file = join("backups", `seed-calendario-${stamp}.csv`);
    const headers = Array.from(reportRows.reduce((a, r) => { for (const k of Object.keys(r)) a.add(k); return a; }, new Set()));
    const esc = (v) => { if (v == null) return ""; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [headers.join(",")];
    for (const r of reportRows) lines.push(headers.map((h) => esc(r[h])).join(","));
    writeFileSync(file, lines.join("\n"));
    log(`CSV: ${file}`);
  }
}

main();
