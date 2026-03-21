import { obtenerPerfilAlumno, listarObservacionesAlumno } from "@/actions/alumno";

function formatFecha(value: string | Date | null): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value + "T12:00:00") : value;
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function formatFechaFull(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "long", year: "numeric" }).format(value);
}

export default async function AlumnoPerfilPage() {
  let perfil;
  let observaciones;

  try {
    [perfil, observaciones] = await Promise.all([
      obtenerPerfilAlumno(),
      listarObservacionesAlumno(),
    ]);
  } catch {
    return (
      <section className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
          <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Mi Perfil</h1>
        </div>
        <article className="rounded-xl border border-danger/30 bg-danger/5 p-6 dark:border-danger/40 dark:bg-danger/10">
          <p className="text-sm font-medium text-danger">
            No fue posible cargar tu perfil. Intenta recargar la pagina.
          </p>
        </article>
      </section>
    );
  }

  if (!perfil) {
    return (
      <section className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
          <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Mi Perfil</h1>
          <p className="mt-1 text-sm text-white/80">No fue posible cargar tus datos.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Mi Perfil</h1>
        <p className="mt-1 text-sm text-white/80">
          Tu informacion personal y observaciones de docentes.
        </p>
      </div>

      {/* Profile card */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Datos Personales
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Nombre
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary dark:text-white">
              {perfil.nombre} {perfil.apellido}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              RUT
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary dark:text-white">
              {perfil.rut ?? "Sin registrar"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Correo electronico
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary dark:text-white">
              {perfil.email ?? "Sin registrar"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Miembro desde
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary dark:text-white">
              {formatFechaFull(perfil.createdAt)}
            </p>
          </div>
        </div>
      </article>

      {/* Observations */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Observaciones de Docentes
        </h2>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Comentarios registrados por tus docentes en las asignaturas.
        </p>

        {observaciones.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No tienes observaciones registradas.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="mt-4 space-y-3 sm:hidden">
              {observaciones.map((obs) => (
                <div
                  key={obs.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-text-primary dark:text-white">
                      {obs.asignaturaNombre}
                    </p>
                    <p className="ml-2 text-xs text-text-secondary dark:text-gray-400">
                      {formatFecha(obs.fechaRegistro)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary dark:text-gray-300">
                    {obs.observacion}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Fecha</th>
                    <th className="px-3 py-2.5">Asignatura</th>
                    <th className="px-3 py-2.5">Observacion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {observaciones.map((obs) => (
                    <tr
                      key={obs.id}
                      className="transition-colors hover:bg-primary/3 dark:hover:bg-primary/5"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-text-secondary dark:text-gray-400">
                        {formatFecha(obs.fechaRegistro)}
                      </td>
                      <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                        {obs.asignaturaNombre}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-300">
                        {obs.observacion}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
