import { obtenerHorarioDocente } from "@/actions/horarios";
import { CalendarioSemanalDocente } from "@/components/docente/CalendarioSemanalDocente";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  asistencia_created: { tone: "success", text: "Asistencia registrada correctamente." },
  asistencia_updated: { tone: "success", text: "Asistencia actualizada correctamente." },
  material_uploaded: { tone: "success", text: "Material subido correctamente." },
  material_deleted: { tone: "success", text: "Material eliminado." },
  forbidden: { tone: "error", text: "No autorizado para operar sobre esta asignatura." },
  error: { tone: "error", text: "No fue posible completar la acción solicitada." },
};

export const metadata = {
  title: "Mis Asignaturas",
};

export default async function DocenteAsignaturasPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string }>;
}) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const bloques = await obtenerHorarioDocente();

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Mis Asignaturas
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Toca cualquier bloque para pasar asistencia, subir material o activar pruebas.
        </p>
      </header>

      <CalendarioSemanalDocente bloques={bloques} />
    </section>
  );
}
