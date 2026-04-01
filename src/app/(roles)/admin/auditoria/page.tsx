import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { ClipboardList, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { auditLogs, usuarios, type AuditAccion } from "@/db/schema";
import { parseAppRole } from "@/lib/authz";
import {
  limpiarVistaAuditoriaFormAction,
  obtenerUltimaLimpiezaAuditoria,
} from "@/actions/auditoria";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const PAGE_SIZE = 25;

const STATUS_MAP = {
  auditoria_limpiada: { tone: "success" as const, text: "Vista de auditoría limpiada. Solo se muestran registros nuevos." },
};

type AuditoriaPageProps = {
  searchParams: Promise<{
    page?: string;
    accion?: string;
    usuarioId?: string;
    entidad?: string;
    todo?: string;
    state?: string;
  }>;
};

export const metadata = {
  title: "Auditoría",
};

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

const ENTIDAD_TABS = [
  { key: "", label: "Todo" },
  { key: "matriculas", label: "Matrículas" },
  { key: "asignaturas", label: "Asignaturas" },
  { key: "usuarios", label: "Usuarios" },
  { key: "notificaciones", label: "Notificaciones" },
  { key: "evaluaciones", label: "Evaluaciones" },
];

const ACCION_COLORS: Record<string, string> = {
  crear: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  editar: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  desactivar: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  activar: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  cambiar_password: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  cerrar_ciclo: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  emitir_certificado: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
};

export default async function AuditoriaPage({ searchParams }: AuditoriaPageProps) {
  const session = await auth();
  const role = parseAppRole(session?.user?.rol);
  if (role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const accionFilter = params.accion?.trim() || undefined;
  const usuarioIdFilter = params.usuarioId?.trim() || undefined;
  const entidadFilter = params.entidad?.trim() || undefined;
  const mostrarTodo = params.todo === "1";

  // Obtener la última limpieza para filtrar visualmente
  const ultimaLimpieza = mostrarTodo ? null : await obtenerUltimaLimpiezaAuditoria();
  const desdeDate = ultimaLimpieza?.createdAt ?? null;

  const db = getDb();

  const conditions = [];
  if (accionFilter) {
    conditions.push(eq(auditLogs.accion, accionFilter as AuditAccion));
  }
  if (usuarioIdFilter) {
    conditions.push(eq(auditLogs.userId, usuarioIdFilter));
  }
  if (entidadFilter) {
    conditions.push(eq(auditLogs.entidad, entidadFilter));
  }
  if (desdeDate) {
    conditions.push(gte(auditLogs.createdAt, desdeDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, rows] = await Promise.all([
    db.select({ total: count() }).from(auditLogs).where(whereClause),
    db
      .select({
        id: auditLogs.id,
        accion: auditLogs.accion,
        entidad: auditLogs.entidad,
        entidadId: auditLogs.entidadId,
        payload: auditLogs.payload,
        ip: auditLogs.ip,
        exitoso: auditLogs.exitoso,
        createdAt: auditLogs.createdAt,
        userId: auditLogs.userId,
        userRol: auditLogs.userRol,
        usuarioNombre: usuarios.nombre,
        usuarioApellido: usuarios.apellido,
      })
      .from(auditLogs)
      .leftJoin(usuarios, eq(auditLogs.userId, usuarios.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);

  const total = Number(totalResult[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (p: number) => {
    const sp = new URLSearchParams();
    sp.set("page", String(p));
    if (accionFilter) sp.set("accion", accionFilter);
    if (usuarioIdFilter) sp.set("usuarioId", usuarioIdFilter);
    if (entidadFilter) sp.set("entidad", entidadFilter);
    if (mostrarTodo) sp.set("todo", "1");
    return `/admin/auditoria?${sp.toString()}`;
  };

  const buildTabHref = (entidad: string) => {
    const sp = new URLSearchParams();
    sp.set("page", "1");
    if (accionFilter) sp.set("accion", accionFilter);
    if (usuarioIdFilter) sp.set("usuarioId", usuarioIdFilter);
    if (entidad) sp.set("entidad", entidad);
    if (mostrarTodo) sp.set("todo", "1");
    return `/admin/auditoria?${sp.toString()}`;
  };

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Registro de Auditoría
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Historial de acciones del sistema.{" "}
            {desdeDate ? (
              <>
                Mostrando desde{" "}
                <span className="font-medium text-text-primary dark:text-white">
                  {formatDate(desdeDate)}
                </span>{" "}
                ({total} registros).{" "}
                <Link
                  href="/admin/auditoria?todo=1"
                  className="text-primary underline hover:no-underline dark:text-primary-light"
                >
                  Ver historial completo
                </Link>
              </>
            ) : (
              <>Total: {total} registros.</>
            )}
          </p>
        </div>

        {/* Botón limpiar vista */}
        <form action={limpiarVistaAuditoriaFormAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-text-secondary shadow-sm transition-colors hover:border-danger hover:text-danger dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-red-500 dark:hover:text-red-400"
            title="Marca este punto como inicio de la vista. Los registros anteriores quedan ocultos pero preservados."
          >
            <Trash2 className="h-4 w-4" />
            Limpiar vista
          </button>
        </form>
      </header>

      {/* Banner de limpieza activa */}
      {ultimaLimpieza && !mostrarTodo && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
          <span>
            Vista limpiada el{" "}
            <span className="font-semibold">{formatDate(ultimaLimpieza.createdAt)}</span>
            {ultimaLimpieza.usuarioNombre && (
              <> por <span className="font-semibold">{ultimaLimpieza.usuarioNombre} {ultimaLimpieza.usuarioApellido ?? ""}</span></>
            )}
            . El historial completo está preservado.
          </span>
          <Link
            href="/admin/auditoria?todo=1"
            className="ml-auto shrink-0 font-medium underline hover:no-underline"
          >
            Ver todo
          </Link>
        </div>
      )}

      {/* Tabs por entidad */}
      <div className="flex flex-wrap gap-2">
        {ENTIDAD_TABS.map((tab) => {
          const isActive = (entidadFilter ?? "") === tab.key;
          return (
            <Link
              key={tab.key}
              href={buildTabHref(tab.key)}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-gray-200 text-text-secondary hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-primary-light dark:hover:text-primary-light"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <article className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50/80 text-left text-xs uppercase tracking-wide text-text-secondary dark:bg-gray-800/50 dark:text-gray-400">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Entidad</th>
                <th className="px-4 py-3">Detalle</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <ClipboardList className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-text-primary dark:text-white">Sin registros de auditoría</p>
                      <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                        Las acciones del sistema se registrarán aquí automáticamente.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-primary/3 dark:hover:bg-primary/5">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary dark:text-gray-400">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-text-primary dark:text-gray-100">
                      <span>
                        {row.usuarioNombre
                          ? `${row.usuarioNombre} ${row.usuarioApellido ?? ""}`.trim()
                          : row.userId
                            ? row.userId.slice(0, 8) + "…"
                            : "—"}
                      </span>
                      {row.userRol && (
                        <span className="ml-1 text-[10px] text-text-muted dark:text-gray-500">({row.userRol})</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          ACCION_COLORS[row.accion ?? ""] ?? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
                        }`}
                      >
                        {row.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400">
                      {row.entidad ?? "—"}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      {row.payload ? (
                        <pre className="max-w-[220px] overflow-hidden text-ellipsis whitespace-pre-wrap break-all text-[10px] text-text-muted dark:text-gray-500">
                          {JSON.stringify(row.payload, null, 1).slice(0, 200)}
                        </pre>
                      ) : (
                        <span className="text-text-muted dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted dark:text-gray-500">
                      {row.ip ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${row.exitoso ? "text-success" : "text-danger"}`}>
                        {row.exitoso ? "OK" : "Error"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        buildHref={buildHref}
        totalCount={total}
      />
    </section>
  );
}
