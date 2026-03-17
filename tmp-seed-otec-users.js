const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    env[key] = value;
  }
  return env;
}

function formatRut(cleanRut) {
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

async function main() {
  const appDir = "/home/impulsate/intranet-otec";
  const env = loadEnv(path.join(appDir, ".env.local"));
  const databaseUrl = env.DATABASE_URL;
  const rutSalt = env.RUT_SALT;

  if (!databaseUrl) throw new Error("DATABASE_URL missing in .env.local");
  if (!rutSalt) throw new Error("RUT_SALT missing in .env.local");

  const pool = new Pool({ connectionString: databaseUrl, ssl: false });

  const superadmins = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      nombre: "Niko",
      apellido: "Lopetegui",
      email: "nikoholas.lopetegui@gmail.com",
      rol: "admin",
      password: "SuperAdmin2026!!",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      nombre: "Vito",
      apellido: "Good",
      email: "vitoko.good@gmail.com",
      rol: "admin",
      password: "SuperAdmin2026!!",
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      nombre: "Docente",
      apellido: "Prueba",
      email: "docente.prueba@miotecimpulsate.cl",
      rol: "docente",
      password: "SuperAdmin2026!!",
    },
  ];

  const alumno = {
    id: "44444444-4444-4444-8444-444444444444",
    nombre: "Alumno",
    apellido: "Prueba",
    rutLimpio: "123456785",
    rol: "alumno",
  };

  try {
    await pool.query("BEGIN");

    for (const user of superadmins) {
      const existing = await pool.query(
        "SELECT id FROM usuarios WHERE email = $1 LIMIT 1",
        [user.email.toLowerCase()],
      );
      const passwordHash = await bcrypt.hash(user.password, 12);

      if (existing.rows[0]?.id) {
        await pool.query(
          `UPDATE usuarios
             SET nombre = $1,
                 apellido = $2,
                 password = $3,
                 rol = $4::rol,
                 activo = true,
                 eliminado_at = NULL,
                 eliminado_por = NULL,
                 updated_at = now()
           WHERE id = $5`,
          [
            user.nombre,
            user.apellido,
            passwordHash,
            user.rol,
            existing.rows[0].id,
          ],
        );
      } else {
        await pool.query(
          `INSERT INTO usuarios
            (id, nombre, apellido, email, password, rol, activo, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6::rol, true, now(), now())`,
          [
            user.id,
            user.nombre,
            user.apellido,
            user.email.toLowerCase(),
            passwordHash,
            user.rol,
          ],
        );
      }
    }

    const rutFormateado = formatRut(alumno.rutLimpio);
    const existingAlumno = await pool.query(
      "SELECT id FROM usuarios WHERE rut = $1 OR rut = $2 LIMIT 1",
      [alumno.rutLimpio, rutFormateado],
    );
    const alumnoId = existingAlumno.rows[0]?.id ?? alumno.id;
    const alumnoSecret = `${rutSalt}${alumno.rutLimpio}${alumnoId}`;
    const alumnoHash = await bcrypt.hash(alumnoSecret, 12);

    if (existingAlumno.rows[0]?.id) {
      await pool.query(
        `UPDATE usuarios
           SET rut = $1,
               nombre = $2,
               apellido = $3,
               email = NULL,
               password = $4,
               rol = alumno::rol,
               activo = true,
               eliminado_at = NULL,
               eliminado_por = NULL,
               updated_at = now()
         WHERE id = $5`,
        [alumno.rutLimpio, alumno.nombre, alumno.apellido, alumnoHash, alumnoId],
      );
    } else {
      await pool.query(
        `INSERT INTO usuarios
          (id, rut, nombre, apellido, email, password, rol, activo, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NULL, $5, alumno::rol, true, now(), now())`,
        [alumno.id, alumno.rutLimpio, alumno.nombre, alumno.apellido, alumnoHash],
      );
    }

    await pool.query("COMMIT");

    const summary = await pool.query(
      "SELECT email, rut, rol, activo FROM usuarios WHERE email = ANY($1::text[]) OR rut = $2 ORDER BY rol, email NULLS LAST",
      [[
        "nikoholas.lopetegui@gmail.com",
        "vitoko.good@gmail.com",
        "docente.prueba@miotecimpulsate.cl",
      ], alumno.rutLimpio],
    );

    console.log("seed_ok");
    for (const row of summary.rows) {
      console.log(`${row.rol} | ${row.email ?? row.rut} | activo=${row.activo}`);
    }
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
