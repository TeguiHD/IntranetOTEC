import {
  countAsignaturasAdmin,
  listarAsignaturasAdmin,
} from "@/actions/asignaturas";
import { listarUsuariosPorRol } from "@/actions/usuarios";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

import { AsignaturaManager } from "./AsignaturaManager";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> =
  {
    asignatura_created: {
      tone: "success",
      text: "Asignatura creada correctamente.",
    },
    docente_assigned: {
      tone: "success",
      text: "Docente asignado correctamente.",
    },
    error: {
      tone: "error",
      text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente.",
    },
  };

type AdminAsignaturasPageProps = {
  searchParams?: Promise<{
    state?: string;
    page?: string;
  }>;
};

export default async function AdminAsignaturasPage({
  searchParams,
}: AdminAsignaturasPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; page?: string }));
  const currentPage = Math.max(1, Number(params?.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [asignaturas, docentes, totalCount] = await Promise.all([
    listarAsignaturasAdmin({ limit: PAGE_SIZE, offset }, { incluirArchivadas: true }),
    listarUsuariosPorRol("docente", { limit: 200, offset: 0 }),
    countAsignaturasAdmin({ incluirArchivadas: true }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const docentesSimple = docentes.map((d) => ({
    id: d.id,
    nombre: d.nombre ?? "",
    apellido: d.apellido ?? "",
  }));

  const asignaturasSimple = asignaturas.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    codigo: a.codigo,
    estado: a.estado,
    fechaInicio: a.fechaInicio,
    duracionMeses: a.duracionMeses,
    maxAlumnos: a.maxAlumnos,
    docenteId: a.docenteId,
    docenteNombre: a.docenteNombre,
    docenteApellido: a.docenteApellido,
  }));

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-gray-100 sm:text-2xl">
          Asignaturas
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">
          Gestiona asignaturas, fechas, duración y docentes responsables.
        </p>
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
        <AsignaturaManager
          asignaturas={asignaturasSimple}
          docentes={docentesSimple}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref="/admin/asignaturas"
        />
      </article>
    </section>
  );
}
