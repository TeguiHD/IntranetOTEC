"use client";

import { useMemo, useState, useTransition } from "react";

import { resolverSolicitudAdminFormAction, eliminarSolicitudesResueltasAction } from "@/actions/solicitudes-documentos";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SearchInput } from "@/components/shared/SearchInput";
import { formatearRut } from "@/lib/rut";

type Solicitud = {
  id: string;
  tipo: string;
  estado: string;
  observacion: string | null;
  createdAt: Date | null;
  resueltoAt: Date | null;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
};

type SolicitudesViewProps = {
  solicitudes: Solicitud[];
};

const TIPO_LABELS: Record<string, string> = {
  credencial: "Credencial",
  alumno_regular: "Certificado alumno regular",
  tarjeta_beneficio: "Tarjeta de beneficio",
};

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  aprobada: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  rechazada: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

type PendingAction = {
  solicitudId: string;
  name: string;
  action: "aprobada" | "rechazada";
} | null;

const formatDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

const formatRut = (rut: string | null) => {
  if (!rut) return "-";
  if (rut.startsWith("EXT-")) return `Ext: ${rut.replace("EXT-", "")}`;
  return formatearRut(rut);
};

const escapeCsvValue = (value: string): string => {
  const normalized = value.replace(/"/g, '""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
};

const buildSolicitudesCsvHref = (items: Solicitud[]): string => {
  const headers = ["Alumno", "RUT", "Tipo", "Estado", "Fecha solicitud", "Fecha resolución", "Observación"];
  const rows = items.map((s) => [
    `${s.alumnoNombre} ${s.alumnoApellido}`,
    formatRut(s.alumnoRut),
    TIPO_LABELS[s.tipo] ?? s.tipo,
    ESTADO_LABELS[s.estado] ?? s.estado,
    formatDate(s.createdAt),
    formatDate(s.resueltoAt),
    s.observacion ?? "",
  ]);
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(","));
  const csv = `\uFEFF${lines.join("\n")}`;
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
};

export function SolicitudesView({ solicitudes }: SolicitudesViewProps) {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [pending, setPending] = useState<PendingAction>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let result = solicitudes;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          `${s.alumnoNombre} ${s.alumnoApellido}`.toLowerCase().includes(q) ||
          s.alumnoRut?.toLowerCase().includes(q),
      );
    }

    if (filterTipo !== "all") {
      result = result.filter((s) => s.tipo === filterTipo);
    }

    if (filterEstado !== "all") {
      result = result.filter((s) => s.estado === filterEstado);
    }

    return result;
  }, [solicitudes, search, filterTipo, filterEstado]);

  const pendientes = filtered.filter((s) => s.estado === "pendiente");
  const resueltas = filtered.filter((s) => s.estado !== "pendiente");

  const handleConfirm = () => {
    if (!pending) return;
    const formData = new FormData();
    formData.set("solicitudId", pending.solicitudId);
    formData.set("estado", pending.action);
    startTransition(async () => {
      await resolverSolicitudAdminFormAction(formData);
      setPending(null);
    });
  };

  const handleDeleteResolved = () => {
    startTransition(async () => {
      await eliminarSolicitudesResueltasAction();
      setDeleteConfirm(false);
    });
  };

  const selectClass =
    "h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

  return (
    <>
      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar por nombre o RUT del alumno…"
            value={search}
            onChange={setSearch}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className={selectClass}
            aria-label="Filtrar por tipo de documento"
          >
            <option value="all">Todos los tipos</option>
            <option value="credencial">Credencial</option>
            <option value="alumno_regular">Alumno regular</option>
            <option value="tarjeta_beneficio">Tarjeta beneficio</option>
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className={selectClass}
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </div>
        <p className="text-sm text-text-secondary dark:text-gray-400">
          {filtered.length} resultados
        </p>
      </div>

      {/* Pending */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Pendientes
          </h2>
          {pendientes.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {pendientes.length}
            </span>
          )}
        </div>

        {pendientes.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No hay solicitudes pendientes.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {pendientes.map((s) => (
              <div key={s.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary dark:text-white">
                      {s.alumnoNombre} {s.alumnoApellido}
                    </p>
                    <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                      {formatRut(s.alumnoRut)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                      {TIPO_LABELS[s.tipo] ?? s.tipo}
                    </span>
                    <p className="mt-1 text-xs text-text-secondary dark:text-gray-500">
                      {formatDate(s.createdAt)}
                    </p>
                  </div>
                </div>

                {s.observacion && (
                  <p className="mt-2 text-sm italic text-text-secondary dark:text-gray-400">
                    &ldquo;{s.observacion}&rdquo;
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPending({ solicitudId: s.id, name: `${s.alumnoNombre} ${s.alumnoApellido}`, action: "aprobada" })}
                    className="h-9 rounded-xl bg-success px-4 text-sm font-semibold text-white transition-colors hover:bg-success/90 active:scale-[0.98]"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPending({ solicitudId: s.id, name: `${s.alumnoNombre} ${s.alumnoApellido}`, action: "rechazada" })}
                    className="h-9 rounded-xl border border-danger/30 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 dark:text-red-400"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      {/* History */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Historial
        </h2>

        {resueltas.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No hay solicitudes resueltas aún.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="mt-4 space-y-3 sm:hidden">
              {resueltas.map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-text-primary dark:text-white">
                      {s.alumnoNombre} {s.alumnoApellido}
                    </p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_STYLES[s.estado] ?? ""}`}>
                      {ESTADO_LABELS[s.estado] ?? s.estado}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-text-secondary dark:text-gray-400">
                    <span>{TIPO_LABELS[s.tipo] ?? s.tipo}</span>
                    <span>Solicitud: {formatDate(s.createdAt)}</span>
                    <span>Resolución: {formatDate(s.resueltoAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Alumno</th>
                    <th className="px-3 py-2.5">Documento</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5">Solicitud</th>
                    <th className="px-3 py-2.5">Resolución</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {resueltas.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                      <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                        {s.alumnoNombre} {s.alumnoApellido}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {TIPO_LABELS[s.tipo] ?? s.tipo}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[s.estado] ?? ""}`}>
                          {ESTADO_LABELS[s.estado] ?? s.estado}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">{formatDate(s.createdAt)}</td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">{formatDate(s.resueltoAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>

      {/* Actions bar for resolved */}
      {resueltas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <a
            href={buildSolicitudesCsvHref(resueltas)}
            download="solicitudes-resueltas.csv"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light"
          >
            Exportar CSV
          </a>
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-danger/30 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 dark:text-red-400"
          >
            Limpiar Resueltas
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        isPending={isPending}
        title={pending?.action === "aprobada" ? "Aprobar solicitud" : "Rechazar solicitud"}
        description={
          pending?.action === "aprobada"
            ? `¿Confirmas aprobar la solicitud de ${pending?.name}?`
            : `¿Confirmas rechazar la solicitud de ${pending?.name}?`
        }
        confirmLabel={pending?.action === "aprobada" ? "Aprobar" : "Rechazar"}
        variant={pending?.action === "rechazada" ? "danger" : "primary"}
      />

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteResolved}
        isPending={isPending}
        title="Limpiar solicitudes resueltas"
        description="¿Confirmas eliminar todas las solicitudes aprobadas y rechazadas? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
      />
    </>
  );
}
