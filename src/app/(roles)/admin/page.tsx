import Link from "next/link";

import { buscarPersonaPorRutAdmin } from "@/actions/usuarios";
import { MessageToast } from "@/components/shared/MessageToast";
import { formatearRut } from "@/lib/rut";

const MODULE_CARDS = [
  {
    href: "/admin/docentes",
    title: "Docentes",
    description: "Crear y desactivar cuentas docentes con política segura.",
  },
  {
    href: "/admin/alumnos",
    title: "Alumnos",
    description: "Registrar alumnos con RUT validado y controlar su acceso.",
  },
  {
    href: "/admin/asignaturas",
    title: "Asignaturas",
    description: "Crear asignaturas y asignar docentes responsables.",
  },
  {
    href: "/admin/matriculas",
    title: "Matrículas",
    description: "Vincular alumnos a asignaturas y gestionar pagos.",
  },
  {
    href: "/admin/clases",
    title: "Clases",
    description: "Programar sesiones y definir publicación de contenido.",
  },
] as const;

type AdminDashboardPageProps = {
  searchParams?: {
    rut?: string;
  };
};

const formatDate = (value: Date | null): string => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
};

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const rutConsulta = typeof searchParams?.rut === "string" ? searchParams.rut.trim() : "";
  const resultadoBusqueda = rutConsulta
    ? await buscarPersonaPorRutAdmin({ rut: rutConsulta })
    : null;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-primary dark:text-gray-100">Dashboard Admin</h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Centro operativo para administración académica y control de usuarios.
        </p>
      </header>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Búsqueda por RUT
        </h2>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">
          Consulta histórico de estudiante o docente con métricas operativas por asignatura.
        </p>

        <form action="/admin" method="get" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full max-w-sm space-y-1">
            <label htmlFor="buscar-rut" className="text-sm font-medium text-text-primary dark:text-gray-100">
              RUT
            </label>
            <input
              id="buscar-rut"
              name="rut"
              type="text"
              inputMode="numeric"
              required
              minLength={8}
              maxLength={12}
              defaultValue={rutConsulta}
              placeholder="12.345.678-5"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Buscar
          </button>
        </form>

        {resultadoBusqueda && !resultadoBusqueda.ok ? (
          <MessageToast message={resultadoBusqueda.message} tone="error" />
        ) : null}

        {resultadoBusqueda && resultadoBusqueda.ok ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950">
              <p className="font-semibold text-text-primary dark:text-gray-100">
                {resultadoBusqueda.persona.nombre} {resultadoBusqueda.persona.apellido}
              </p>
              <p className="mt-1 text-text-secondary dark:text-gray-300">
                RUT: {resultadoBusqueda.persona.rut ? formatearRut(resultadoBusqueda.persona.rut) : "-"} · Rol: {resultadoBusqueda.persona.rol}
              </p>
            </div>

            {resultadoBusqueda.role === "alumno" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Asignaturas históricas
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-text-primary dark:text-gray-100">
                      {resultadoBusqueda.metrics.asignaturasHistoricas}
                    </p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Asignaturas activas
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-text-primary dark:text-gray-100">
                      {resultadoBusqueda.metrics.asignaturasActivas}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-300">
                        <th className="px-3 py-2">Asignatura</th>
                        <th className="px-3 py-2">Estado asignatura</th>
                        <th className="px-3 py-2">Estado pago</th>
                        <th className="px-3 py-2">Matrícula</th>
                        <th className="px-3 py-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {resultadoBusqueda.historial.length > 0 ? (
                        resultadoBusqueda.historial.map((row) => (
                          <tr key={row.matriculaId}>
                            <td className="px-3 py-2 text-text-primary dark:text-gray-100">{row.asignaturaNombre}</td>
                            <td className="px-3 py-2 text-text-secondary dark:text-gray-300">{row.estadoAsignatura ?? "-"}</td>
                            <td className="px-3 py-2 text-text-secondary dark:text-gray-300">{row.estadoPago ?? "-"}</td>
                            <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                              {row.activa ? "Activa" : "Inactiva"}
                            </td>
                            <td className="px-3 py-2 text-text-secondary dark:text-gray-300">{formatDate(row.fechaMatricula)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-text-secondary dark:text-gray-400">
                            No hay historial de matrículas para este alumno.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Cursos impartidos
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-text-primary dark:text-gray-100">
                      {resultadoBusqueda.metrics.cursosHistoricos}
                    </p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Material cargado
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-text-primary dark:text-gray-100">
                      {resultadoBusqueda.metrics.materialCargado}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-300">
                        <th className="px-3 py-2">Asignatura</th>
                        <th className="px-3 py-2">Estado</th>
                        <th className="px-3 py-2 text-right">Estudiantes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {resultadoBusqueda.asignaturas.length > 0 ? (
                        resultadoBusqueda.asignaturas.map((row) => (
                          <tr key={row.asignaturaId}>
                            <td className="px-3 py-2 text-text-primary dark:text-gray-100">{row.asignaturaNombre}</td>
                            <td className="px-3 py-2 text-text-secondary dark:text-gray-300">{row.estadoAsignatura ?? "-"}</td>
                            <td className="px-3 py-2 text-right text-text-primary dark:text-gray-100">{row.totalEstudiantes}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-text-secondary dark:text-gray-400">
                            Este docente no tiene asignaturas registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : null}
      </article>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULE_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-md border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">{card.title}</h2>
            <p className="mt-2 text-sm text-text-secondary dark:text-gray-300">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}