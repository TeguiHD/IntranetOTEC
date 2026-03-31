import { and, count, desc, eq } from "drizzle-orm";
import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { auditLogs, usuarios, type AuditAccion } from "@/db/schema";
import { parseAppRole } from "@/lib/authz";

const PAGE_SIZE = 25;

type AuditoriaPageProps = {
  searchParams: Promise<{ page?: string; accion?: string; usuarioId?: string }>;
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

  const db = getDb();

  const conditions = [];
  if (accionFilter) {
    conditions.push(eq(auditLogs.accion, accionFilter as AuditAccion));
  }
  if (usuarioIdFilter) {
    conditions.push(eq(auditLogs.userId, usuarioIdFilter));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause),
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
    return `/admin/auditoria?${sp.toString()}`;
  };

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Registro de Auditoría
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Historial de acciones realizadas en el sistema. Total: {total} registros.
        </p>
      </header>

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
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          <p className="text-text-secondary dark:text-gray-400">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildHref(page - 1)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildHref(page + 1)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                Siguiente
              </Link>
            )}
          </div>
        </nav>
      )}
    </section>
  );
}
