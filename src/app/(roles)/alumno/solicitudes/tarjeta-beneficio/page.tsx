import { CreditCard, Gift } from "lucide-react";

import { obtenerAccesoDocumentosAlumnoActual } from "@/actions/accesos-documentos";
import { listarTarjetasAsistenciaAlumno } from "@/actions/alumno-asistencias";
import { obtenerPerfilAlumnoActual } from "@/actions/solicitudes-documentos";
import { TarjetaBeneficio } from "@/components/beneficio/TarjetaBeneficio";
import { normalizarTextoVisible } from "@/lib/displayText";
import { formatearRut } from "@/lib/rut";

export const metadata = { title: "Tarjeta de Beneficio" };

export default async function SolicitudTarjetaBeneficioPage() {
  const [perfil, accesos, tarjetasAsistencia] = await Promise.all([
    obtenerPerfilAlumnoActual(),
    obtenerAccesoDocumentosAlumnoActual(),
    listarTarjetasAsistenciaAlumno(),
  ]);
  const beneficioHabilitado = accesos?.beneficioHabilitado ?? true;

  const rutDisplay = perfil?.rut
    ? perfil.rut.startsWith("EXT-")
      ? `Ext: ${perfil.rut.replace(/^EXT-/, "")}`
      : formatearRut(perfil.rut)
    : undefined;

  return (
    <section className="space-y-5">
      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-[#F5A623]/15 p-2 text-[#F5A623]">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Tarjeta de Beneficio
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Tu tarjeta del Club de Beneficios Impulsate.
          </p>
        </div>
      </header>

      {!beneficioHabilitado ? (
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm dark:border-amber-800/70 dark:bg-amber-900/20 dark:text-amber-200">
          La tarjeta de beneficio no está habilitada para tu usuario o curso. Contacta a administración si necesitas activarla.
        </article>
      ) : perfil ? (
        <>
          <TarjetaBeneficio
            rut={rutDisplay}
            nombre={perfil.nombre}
            apellido={perfil.apellido}
          />

          <section className="space-y-4">
            <header className="flex items-center gap-3">
              <span className="rounded-xl bg-emerald-500/15 p-2 text-emerald-500">
                <Gift className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold uppercase text-text-primary dark:text-white">
                  Tarjeta de Recompensas
                </h2>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  Beneficios asociados a asistencia completa por curso.
                </p>
              </div>
            </header>

            {tarjetasAsistencia.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {tarjetasAsistencia.map((tarjeta) => {
                  const completadas = tarjeta.sesiones.filter((sesion) =>
                    sesion.estado === "presente" ||
                    sesion.estado === "tardanza" ||
                    sesion.estado === "justificado",
                  ).length;
                  const recompensaActiva = completadas >= 8;

                  return (
                    <article
                      key={tarjeta.matriculaId}
                      className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-text-primary dark:text-white">
                            {normalizarTextoVisible(tarjeta.asignaturaNombre)}
                          </h3>
                          <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                            {recompensaActiva
                              ? "Recompensa disponible por asistencia completa."
                              : "Completa las 8 asistencias para activar beneficios."}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          recompensaActiva
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {completadas}/8
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, index) => {
                          const sesion = tarjeta.sesiones[index];
                          const asistio =
                            sesion?.estado === "presente" ||
                            sesion?.estado === "tardanza" ||
                            sesion?.estado === "justificado";
                          const className = !sesion
                            ? "border-gray-200 bg-gray-50 text-text-muted dark:border-gray-800 dark:bg-gray-800 dark:text-gray-500"
                            : asistio
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : sesion.estado === "ausente"
                                ? "border-red-500 bg-red-500 text-white"
                                : "border-gray-300 bg-white text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400";

                          return (
                            <div
                              key={index}
                              className={`flex aspect-square min-h-14 items-center justify-center rounded-xl border text-sm font-bold shadow-sm ${className}`}
                            >
                              {index + 1}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <article className="rounded-2xl border border-gray-200/80 bg-white p-5 text-sm text-text-secondary shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                Aún no hay asistencias suficientes para mostrar recompensas.
              </article>
            )}
          </section>
        </>
      ) : (
        <p className="text-sm text-text-secondary dark:text-gray-400">
          No se pudo cargar tu información.
        </p>
      )}
    </section>
  );
}
