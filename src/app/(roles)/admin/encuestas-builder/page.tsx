import { ClipboardList, FileText, Rocket, Users } from "lucide-react";
import { Suspense } from "react";

import { listarEncuestasAdmin } from "@/actions/encuestas-unificadas";
import { StatCard } from "@/components/charts/StatCard";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { CampanaGroup, EncuestaRow } from "./CampanaGroup";
import { EncuestasCrearForm } from "./EncuestasCrearForm";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  encuesta_created: { tone: "success", text: "Encuesta creada. Agrega preguntas y lánzala." },
  encuesta_deleted: { tone: "success", text: "Encuesta eliminada correctamente." },
  error: { tone: "error", text: "No fue posible completar la acción." },
};

type Props = {
  searchParams?: Promise<{ state?: string }>;
};

export const metadata = { title: "Constructor de Encuestas" };

export default async function AdminEncuestasBuilderPage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const encuestas = await listarEncuestasAdmin();

  // ── Global stats ─────────────────────────────────────────────
  const totalEncuestas = encuestas.length;
  const activas = encuestas.filter((e) => e.estadoEncuesta === "activa").length;
  const borradores = encuestas.filter((e) => e.estadoEncuesta === "borrador").length;
  const totalAsignados = encuestas.reduce((s, e) => s + (e.totalAsignados ?? 0), 0);
  const totalCompletados = encuestas.reduce((s, e) => s + (e.totalCompletados ?? 0), 0);

  // ── Group by grupoId ─────────────────────────────────────────
  const campanasMap = new Map<string, typeof encuestas>();
  const individual: typeof encuestas = [];

  for (const enc of encuestas) {
    if (enc.grupoId) {
      if (!campanasMap.has(enc.grupoId)) campanasMap.set(enc.grupoId, []);
      campanasMap.get(enc.grupoId)!.push(enc);
    } else {
      individual.push(enc);
    }
  }
  const campanas = Array.from(campanasMap.values());

  return (
    <section className="space-y-6">
      <Suspense>
        <RouteStateToast state={params.state} map={STATUS_MAP} />
      </Suspense>

      {/* ── Header ── */}
      <header className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Constructor de Encuestas
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Crea encuestas desde plantillas, asígnalas a uno o varios cursos y analiza resultados.
          </p>
        </div>
      </header>

      {/* ── Stats (only when there are surveys) ── */}
      {totalEncuestas > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total encuestas"
            value={totalEncuestas}
            sublabel={`${activas} activa${activas !== 1 ? "s" : ""}, ${borradores} borrador${borradores !== 1 ? "es" : ""}`}
            Icon={FileText}
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
          <StatCard
            label="Activas ahora"
            value={activas}
            sublabel={activas > 0 ? "Recibiendo respuestas" : "Ninguna activa"}
            Icon={Rocket}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          />
          <StatCard
            label="Respuestas"
            value={totalCompletados}
            sublabel={
              totalAsignados > 0
                ? `${Math.round((totalCompletados / totalAsignados) * 100)}% de ${totalAsignados} asignados`
                : "Sin asignaciones aún"
            }
            Icon={Users}
            iconColor="text-violet-600 dark:text-violet-400"
            iconBg="bg-violet-100 dark:bg-violet-900/30"
          />
          <StatCard
            label="Campañas"
            value={campanas.length}
            sublabel={`${individual.length} encuesta${individual.length !== 1 ? "s" : ""} individual${individual.length !== 1 ? "es" : ""}`}
            Icon={ClipboardList}
            iconColor="text-indigo-600 dark:text-indigo-400"
            iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          />
        </div>
      )}

      {/* ── Create form ── */}
      <EncuestasCrearForm />

      {/* ── Encuestas list ── */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Encuestas registradas
          </h2>
          {totalEncuestas > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {totalEncuestas}
            </span>
          )}
        </div>

        {totalEncuestas === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-gray-200 dark:text-gray-700" strokeWidth={1.5} />
            <p className="text-sm font-medium text-text-secondary dark:text-gray-400">
              Aún no hay encuestas. Crea la primera usando el formulario de arriba.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Campaigns (grouped) */}
            {campanas.map((grupo) => (
              <CampanaGroup key={grupo[0].grupoId} encuestas={grupo} />
            ))}

            {/* Individual surveys */}
            {individual.map((enc) => (
              <EncuestaRow key={enc.id} enc={enc} />
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
