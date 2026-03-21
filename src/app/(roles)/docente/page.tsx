import Link from "next/link";
import { BookOpen, Users, Calendar, FileText, ArrowRight, GraduationCap } from "lucide-react";

import { auth } from "@/auth";
import { listarAsignaturasDocente, obtenerResumenDocente } from "@/actions/docente";

export default async function DocenteDashboardPage() {
  const [session, asignaturas, resumen] = await Promise.all([
    auth(),
    listarAsignaturasDocente(),
    obtenerResumenDocente(),
  ]);

  const activas = asignaturas.filter((a) => a.estado === "activo");
  const finalizadas = asignaturas.filter((a) => a.estado === "finalizado");
  const borradores = asignaturas.filter((a) => a.estado === "borrador");

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <p className="text-sm font-medium text-white/70 uppercase tracking-wider">Bienvenido/a</p>
        <h1 className="mt-0.5 text-xl font-bold text-white sm:text-2xl">{session?.user?.name ?? "Docente"}</h1>
        <p className="mt-1 text-sm text-white/80">
          Gestiona tus asignaturas, registra clases y haz seguimiento a tus alumnos.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary dark:text-white">{activas.length}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Cursos activos</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-950">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary dark:text-white">{resumen.totalAlumnos}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Alumnos inscritos</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary dark:text-white">{resumen.proximasClases}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Próximas clases</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary dark:text-white">{finalizadas.length}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Finalizadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mis Asignaturas card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Mis Asignaturas
            </h2>
          </div>
          <Link
            href="/docente/asignaturas"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:hover:bg-primary/20"
          >
            Ver todas
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {asignaturas.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm text-text-secondary dark:text-gray-400">
              Aún no tienes asignaturas asignadas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {asignaturas.slice(0, 6).map((asig) => {
              const estadoBadge: Record<string, string> = {
                activo:     "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
                finalizado: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                borrador:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                archivado:  "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
              };
              const estadoLabel: Record<string, string> = {
                activo:     "Activo",
                finalizado: "Finalizado",
                borrador:   "Borrador",
                archivado:  "Archivado",
              };
              const badge = estadoBadge[asig.estado ?? ""] ?? "bg-gray-100 text-gray-500";
              const label = estadoLabel[asig.estado ?? ""] ?? asig.estado ?? "-";

              return (
                <Link
                  key={asig.id}
                  href={`/docente/asignaturas?asignaturaId=${asig.id}`}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary dark:text-white">
                      {asig.nombre}
                    </p>
                    {asig.codigo && (
                      <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                        {asig.codigo}
                      </p>
                    )}
                  </div>
                  <span
                    className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}`}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {asignaturas.length > 6 && (
          <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <Link
              href="/docente/asignaturas"
              className="text-xs text-text-secondary transition-colors hover:text-primary dark:text-gray-400 dark:hover:text-primary"
            >
              +{asignaturas.length - 6} asignaturas más →
            </Link>
          </div>
        )}
      </div>

      {/* Secondary stats: borradores callout (only if any exist) */}
      {borradores.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Tienes{" "}
            <span className="font-semibold">{borradores.length}</span>{" "}
            {borradores.length === 1 ? "asignatura en borrador" : "asignaturas en borrador"}.{" "}
            <Link
              href="/docente/asignaturas"
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              Ir a asignaturas
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
