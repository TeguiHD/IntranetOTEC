import { and, desc, eq, isNull } from "drizzle-orm";

import { auth } from "@/auth";
import { CambiarPinForm } from "@/components/alumno/CambiarPinForm";
import { getDb } from "@/db";
import { asignaturas, matriculas, usuarios } from "@/db/schema";

export const metadata = {
  title: "Mi Perfil",
};

export default async function AlumnoPerfilPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <section className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
          <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Mi Perfil</h1>
        </div>
      </section>
    );
  }

  const db = getDb();

  const [alumno] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      email: usuarios.email,
      rut: usuarios.rut,
      rol: usuarios.rol,
    })
    .from(usuarios)
    .where(and(eq(usuarios.id, userId), isNull(usuarios.eliminadoAt)))
    .limit(1);

  const asignaturasActivas = alumno
    ? await db
        .select({
          id: asignaturas.id,
          nombre: asignaturas.nombre,
          estado: asignaturas.estado,
          fechaInicio: asignaturas.fechaInicio,
        })
        .from(matriculas)
        .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
        .where(
          and(
            eq(matriculas.alumnoId, userId),
            eq(matriculas.activa, true),
            isNull(matriculas.eliminadoAt),
          ),
        )
        .orderBy(desc(asignaturas.fechaInicio))
    : [];

  if (!alumno) {
    return (
      <section className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
          <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Mi Perfil</h1>
        </div>
        <p className="text-sm text-text-secondary dark:text-gray-400">No se encontró tu perfil.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Mi Perfil</h1>
        <p className="mt-1 text-sm text-white/80">Información de tu cuenta.</p>
      </div>

      {/* Info card */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
          Datos personales
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">Nombre</dt>
            <dd className="mt-0.5 text-sm font-medium text-text-primary dark:text-white">
              {alumno.nombre} {alumno.apellido}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">RUT / Credencial</dt>
            <dd className="mt-0.5 text-sm font-medium text-text-primary dark:text-white">
              {alumno.rut ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">Correo</dt>
            <dd className="mt-0.5 text-sm font-medium text-text-primary dark:text-white">
              {alumno.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">Rol</dt>
            <dd className="mt-0.5 text-sm font-medium capitalize text-text-primary dark:text-white">
              {alumno.rol}
            </dd>
          </div>
        </dl>

      </article>

      {/* Cambiar clave */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
          Cambiar clave
        </h2>
        <p className="mb-4 text-sm text-text-secondary dark:text-gray-400">
          Tu clave es de 4 dígitos numéricos. Puedes cambiarla aquí.
        </p>
        <CambiarPinForm />
      </article>

      {/* Asignaturas activas */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
          Mis asignaturas activas
        </h2>
        {asignaturasActivas.length === 0 ? (
          <p className="text-sm text-text-secondary dark:text-gray-400">
            No tienes asignaturas activas en este momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {asignaturasActivas.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <span className="text-sm font-medium text-text-primary dark:text-white">{a.nombre}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                    a.estado === "activo"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {a.estado ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
