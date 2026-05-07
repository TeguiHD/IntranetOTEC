"use client";

import { useRef, useMemo, useState, useTransition } from "react";

import { Archive, BookOpen, Pencil, Plus, RotateCcw, Search, Trash2, UserCog, Users, X } from "lucide-react";

import {
  archivarAsignaturaFormAction,
  asignarDocenteFormAction,
  crearAsignaturaFormAction,
  desarchivariAsignaturaFormAction,
  editarAsignaturaFormAction,
  eliminarAsignaturaFormAction,
} from "@/actions/asignaturas";
import { activarUsuarioAction } from "@/actions/usuarios";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Modal } from "@/components/shared/Modal";
import { Pagination } from "@/components/shared/Pagination";

/* ─── Types ─────────────────────────────────────────────────────────── */

type Docente = {
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  activo: boolean;
};

type Asignatura = {
  id: string;
  nombre: string;
  codigo: string | null;
  estado: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  duracionMeses: number;
  maxAlumnos: number | null;
  docenteId: string | null;
  docenteNombre: string | null;
  docenteApellido: string | null;
};

type CursoCombo = {
  id: string;
  nombre: string;
  codigo: string;
};

type PeriodoCombo = {
  id: string;
  codigo: string;
  nombre: string;
  estado: "planificado" | "activo" | "cerrado";
};

type AsignaturaManagerProps = {
  asignaturas: Asignatura[];
  docentes: Docente[];
  cursos: CursoCombo[];
  periodos: PeriodoCombo[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  buildHref: string;
};

/* ─── Constants ─────────────────────────────────────────────────────── */

const ESTADO_BADGE: Record<string, string> = {
  activo:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  borrador:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  finalizado:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  archivado: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const INPUT =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

/* ─── DocenteCombobox ─────────────────────────────────────────────── */
function DocenteCombobox({
  docentes,
  defaultId,
  name,
  onSelect,
  onReactivated,
}: {
  docentes: Docente[];
  defaultId: string | null;
  name: string;
  onSelect?: (d: Docente | null) => void;
  onReactivated?: () => void;
}) {
  const defaultDocente = docentes.find((d) => d.id === defaultId) ?? null;
  const [query, setQuery] = useState(
    defaultDocente
      ? `${defaultDocente.nombre} ${defaultDocente.apellido}`
      : "",
  );
  const [selected, setSelected] = useState<Docente | null>(defaultDocente);
  const [open, setOpen] = useState(false);
  const [reactivating, setReactivating] = useState<string | null>(null);
  const [isPendingReactivate, startReactivateTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return docentes;
    return docentes.filter(
      (d) =>
        `${d.nombre} ${d.apellido}`.toLowerCase().includes(q) ||
        d.nombre.toLowerCase().includes(q) ||
        d.apellido.toLowerCase().includes(q) ||
        (d.rut && d.rut.toLowerCase().includes(q)),
    );
  }, [docentes, query]);

  const handleSelect = (d: Docente) => {
    if (!d.activo) return;
    setSelected(d);
    setQuery(`${d.nombre} ${d.apellido}`);
    setOpen(false);
    onSelect?.(d);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setOpen(false);
    onSelect?.(null);
  };

  const handleReactivate = (d: Docente) => {
    setReactivating(d.id);
    startReactivateTransition(async () => {
      await activarUsuarioAction({ userId: d.id });
      setReactivating(null);
      onReactivated?.();
    });
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
        Docente responsable
      </label>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={query}
            placeholder="Buscar por nombre o RUT..."
            autoComplete="off"
            inputMode="search" onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
              onSelect?.(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          {selected && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpiar"
              className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {open && filtered.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {filtered.map((d) => (
              <li key={d.id} role="option" aria-selected={selected?.id === d.id}>
                <div
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                    !d.activo
                      ? "opacity-70"
                      : selected?.id === d.id
                        ? "bg-primary/5 dark:bg-primary/10"
                        : "hover:bg-primary/5 dark:hover:bg-primary/10"
                  }`}
                >
                  <button
                    type="button"
                    onMouseDown={() => handleSelect(d)}
                    disabled={!d.activo}
                    className={`flex min-w-0 flex-1 flex-col text-left ${
                      !d.activo ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <span className={`truncate ${
                      selected?.id === d.id
                        ? "font-medium text-primary dark:text-primary-light"
                        : "text-text-primary dark:text-gray-100"
                    }`}>
                      {d.nombre} {d.apellido}
                    </span>
                    <span className="text-[11px] text-text-muted dark:text-gray-500">
                      {d.rut ?? "Sin RUT"}
                    </span>
                  </button>
                  {d.activo ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Activo
                    </span>
                  ) : (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleReactivate(d);
                      }}
                      disabled={isPendingReactivate && reactivating === d.id}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                    >
                      <RotateCcw className={`h-3 w-3 ${isPendingReactivate && reactivating === d.id ? "animate-spin" : ""}`} />
                      {isPendingReactivate && reactivating === d.id ? "Activando..." : "Inactivo · Reactivar"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {open && query.length > 0 && filtered.length === 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-secondary shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Sin resultados para «{query}»
          </div>
        )}
      </div>
      {selected && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Seleccionado: {selected.nombre} {selected.apellido}
        </p>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export function AsignaturaManager({
  asignaturas,
  docentes,
  cursos,
  periodos,
  totalCount,
  currentPage,
  totalPages,
  pageSize,
  buildHref,
}: AsignaturaManagerProps) {
  const [openCreate, setOpenCreate] = useState(false);
  const [editingAsig, setEditingAsig] = useState<Asignatura | null>(null);
  const [assigningAsig, setAssigningAsig] = useState<Asignatura | null>(null);
  const [confirmDocente, setConfirmDocente] = useState<Docente | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [archivingAsig, setArchivingAsig] = useState<Asignatura | null>(null);
  const [unarchivingAsig, setUnarchivingAsig] = useState<Asignatura | null>(null);
  const [deletingAsig, setDeletingAsig] = useState<Asignatura | null>(null);
  const [isPending, startTransition] = useTransition();
  const assignFormRef = useRef<HTMLFormElement>(null);
  const archiveFormRef = useRef<HTMLFormElement>(null);
  const unarchiveFormRef = useRef<HTMLFormElement>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const handleAssignSubmit = () => {
    if (!confirmDocente || !assignFormRef.current) return;
    setShowConfirm(false);
    startTransition(() => {
      assignFormRef.current?.requestSubmit();
    });
  };

  const rangeStart = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const rangeEnd = totalCount > 0 ? Math.min(currentPage * pageSize, totalCount) : 0;

  return (
    <>
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
              Secciones registradas
            </h2>
            {totalCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                {totalCount}
              </span>
            )}
          </div>
          {totalCount > 0 && (
            <p className="text-xs text-text-secondary dark:text-gray-400">
              Mostrando {rangeStart} a {rangeEnd} de {totalCount} secciones.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-4 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/35 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva sección</span>
        </button>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          buildHref={(page) => `${buildHref}page=${page}`}
        />
      )}

      {/* Empty state */}
      {asignaturas.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-700">
          <BookOpen
            className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600"
            strokeWidth={1.5}
          />
          <p className="mt-3 text-sm font-medium text-text-secondary dark:text-gray-400">
            Aún no hay secciones
          </p>
          <p className="mt-1 text-xs text-text-muted dark:text-gray-500">
            Crea la primera con el botón de arriba
          </p>
        </div>
      )}

      {/* Mobile: cards */}
      {asignaturas.length > 0 && (
        <div className="mt-4 space-y-3 sm:hidden">
          {asignaturas.map((a) => {
            const estadoClass =
              ESTADO_BADGE[a.estado ?? ""] ??
              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
            const docenteLabel = a.docenteNombre
              ? `${a.docenteNombre} ${a.docenteApellido ?? ""}`.trim()
              : null;

            return (
              <div
                key={a.id}
                className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text-primary dark:text-white">
                      {a.nombre}
                    </p>
                    {a.codigo && (
                      <span className="mt-0.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary dark:bg-primary/20 dark:text-primary-light">
                        {a.codigo}
                      </span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${estadoClass}`}
                  >
                    {a.estado}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary dark:text-gray-400">
                  <span>Inicio: {a.fechaInicio}</span>
                  <span>{a.duracionMeses} meses</span>
                  {a.maxAlumnos && <span>Máx. {a.maxAlumnos} alumnos</span>}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {docenteLabel ? (
                      <>
                        <UserCog className="mr-1 inline h-3.5 w-3.5" />
                        {docenteLabel}
                      </>
                    ) : (
                      <span className="italic text-text-muted dark:text-gray-500">
                        Sin docente
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <a
                      href={`/admin/matriculas?asignaturaId=${a.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Alumnos
                    </a>
                    <button
                      type="button"
                      onClick={() => setEditingAsig(a)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    {(a.estado === "activo" || a.estado === "borrador") && (
                      <button
                        type="button"
                        onClick={() => setAssigningAsig(a)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary/30 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:border-primary/40 dark:text-primary-light"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                        Asignar
                      </button>
                    )}
                    {a.estado !== "archivado" && (
                      <button
                        type="button"
                        onClick={() => setArchivingAsig(a)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archivar
                      </button>
                    )}
                    {a.estado === "archivado" && (
                      <button
                        type="button"
                        onClick={() => setUnarchivingAsig(a)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-200 px-3 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Desarchivar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeletingAsig(a)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Borrar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop: table */}
      {asignaturas.length > 0 && (
        <div className="mt-4 hidden overflow-x-auto sm:block">
          <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                <th className="px-3 py-2.5">Sección</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Vigencia</th>
                <th className="px-3 py-2.5">Docente</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {asignaturas.map((a) => {
                const estadoClass =
                  ESTADO_BADGE[a.estado ?? ""] ??
                  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                const docenteLabel = a.docenteNombre
                  ? `${a.docenteNombre} ${a.docenteApellido ?? ""}`.trim()
                  : null;
                const canAssign =
                  a.estado === "activo" || a.estado === "borrador";

                return (
                  <tr
                    key={a.id}
                    className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5"
                  >
                    {/* Nombre + código */}
                    <td className="px-3 py-3">
                      <p className="font-medium text-text-primary dark:text-gray-100">
                        {a.nombre}
                      </p>
                      {a.codigo && (
                        <span className="mt-0.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary dark:bg-primary/20 dark:text-primary-light">
                          {a.codigo}
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${estadoClass}`}
                      >
                        {a.estado}
                      </span>
                    </td>

                    {/* Periodo */}
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                      <span>{a.fechaInicio}</span>
                      <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-gray-800">
                        {a.duracionMeses}m
                      </span>
                    </td>

                    {/* Docente */}
                    <td className="px-3 py-3">
                      {docenteLabel ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
                            {(a.docenteNombre?.[0] ?? "") +
                              (a.docenteApellido?.[0] ?? "")}
                          </div>
                          <span className="text-sm text-text-primary dark:text-gray-100">
                            {docenteLabel}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-text-muted dark:text-gray-500">
                          Sin asignar
                        </span>
                      )}
                    </td>

                    {/* Acción */}
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        <a
                          href={`/admin/matriculas?asignaturaId=${a.id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Alumnos
                        </a>
                        <button
                          type="button"
                          onClick={() => setEditingAsig(a)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        {canAssign && (
                          <button
                            type="button"
                            onClick={() => setAssigningAsig(a)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary/30 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:border-primary/40 dark:text-primary-light"
                          >
                            <UserCog className="h-3.5 w-3.5" />
                            {docenteLabel ? "Cambiar docente" : "Asignar docente"}
                          </button>
                        )}
                        {a.estado !== "archivado" && (
                          <button
                            type="button"
                            onClick={() => setArchivingAsig(a)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-200 px-3 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archivar
                          </button>
                        )}
                        {a.estado === "archivado" && (
                          <button
                            type="button"
                            onClick={() => setUnarchivingAsig(a)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-200 px-3 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Desarchivar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeletingAsig(a)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        buildHref={(page) => `${buildHref}page=${page}`}
      />

      {/* ── Modal: Nueva asignatura ── */}
      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Nueva sección"
        description="Completa los datos para crear una nueva sección."
        size="max-w-2xl"
      >
        <form action={crearAsignaturaFormAction} className="space-y-4">
          {/* Curso template (requerido) */}
          <div className="space-y-1.5">
            <label htmlFor="new-curso-id" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Curso <span className="text-danger">*</span>
            </label>
            <select
              id="new-curso-id"
              name="cursoId"
              required
              className={`${INPUT} appearance-none`}
            >
              <option value="">— Selecciona curso —</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>
              ))}
            </select>
          </div>

          {/* Periodo academico */}
          <div className="space-y-1.5">
            <label htmlFor="new-periodo-id" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Periodo academico <span className="text-danger">*</span>
            </label>
            <select
              id="new-periodo-id"
              name="periodoId"
              required
              className={`${INPUT} appearance-none`}
            >
              <option value="">— Selecciona periodo —</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Turno */}
          <div className="space-y-1.5">
            <label htmlFor="new-turno" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Turno <span className="text-danger">*</span>
            </label>
            <select
              id="new-turno"
              name="turno"
              required
              className={`${INPUT} appearance-none`}
            >
              <option value="">— Selecciona turno —</option>
              <option value="manana">Mañana</option>
              <option value="tarde">Tarde</option>
              <option value="vespertino">Vespertino</option>
            </select>
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Nombre <span className="text-danger">*</span>
            </label>
            <input
              name="nombre"
              type="text"
              required
              minLength={3}
              maxLength={120}
              placeholder="Ej: Primeros Auxilios Básicos"
              className={INPUT} inputMode="text"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Descripción{" "}
              <span className="text-xs font-normal text-text-muted dark:text-gray-500">
                (opcional)
              </span>
            </label>
            <textarea
              name="descripcion"
              rows={3}
              maxLength={500}
              placeholder="Descripción del contenido del curso..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Código */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Código único{" "}
                <span className="text-xs font-normal text-text-muted dark:text-gray-500">
                  (opcional)
                </span>
              </label>
              <input
                name="codigo"
                type="text"
                maxLength={24}
                placeholder="ASIG-001"
                className={`${INPUT} font-mono uppercase tracking-wider`} inputMode="text"
              />
              <p className="text-[11px] text-text-muted dark:text-gray-500">
                Identifica la sección de forma única. Útil cuando hay cursos con el mismo nombre en distintos períodos.
              </p>
            </div>

            {/* Fecha inicio */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Fecha inicio <span className="text-danger">*</span>
              </label>
              <input
                name="fechaInicio"
                type="date"
                required
                className={INPUT} inputMode="text"
              />
            </div>

            {/* Duración */}
            <div className="space-y-1.5">
              <label htmlFor="new-duracion" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Duración (meses) <span className="text-danger">*</span>
              </label>
              <input
                id="new-duracion"
                name="duracionMeses"
                type="number"
                required
                min={1}
                max={12}
                defaultValue={4}
                className={INPUT} inputMode="numeric"
              />
              <p className="text-xs text-text-muted dark:text-gray-500">Entre 1 y 12 meses.</p>
            </div>

            {/* Máx alumnos */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Máximo alumnos <span className="text-danger">*</span>
              </label>
              <input
                name="maxAlumnos"
                type="number"
                required
                min={1}
                max={300}
                defaultValue={30}
                className={INPUT} inputMode="numeric"
              />
            </div>
          </div>

          {/* Docente */}
          <DocenteCombobox
            docentes={docentes}
            defaultId={null}
            name="docenteId"
          />

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setOpenCreate(false)}
              className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cursos.length === 0 || periodos.length === 0}
              className="h-10 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
            >
              Crear sección
            </button>
          </div>

          {(cursos.length === 0 || periodos.length === 0) && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Necesitas al menos un curso y un periodo academico para crear una seccion.
            </p>
          )}
        </form>
      </Modal>

      {/* ── Modal: Editar sección ── */}
      <Modal
        open={editingAsig !== null}
        onClose={() => setEditingAsig(null)}
        title={editingAsig ? `Editar sección · ${editingAsig.nombre}` : "Editar sección"}
        description={editingAsig?.codigo ? `Código: ${editingAsig.codigo}` : undefined}
        size="max-w-xl"
      >
        {editingAsig && (
          <form action={editarAsignaturaFormAction} className="space-y-4">
            <input type="hidden" name="id" value={editingAsig.id} />
            <input type="hidden" name="nombre" value={editingAsig.nombre} />
            <input type="hidden" name="descripcion" value="" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  Fecha inicio <span className="text-danger">*</span>
                </label>
                <input
                  name="fechaInicio"
                  type="date"
                  required
                  defaultValue={editingAsig.fechaInicio}
                  className={INPUT} inputMode="text"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  Fecha término <span className="text-danger">*</span>
                </label>
                <input
                  name="fechaFin"
                  type="date"
                  required
                  defaultValue={editingAsig.fechaFin ?? editingAsig.fechaInicio}
                  className={INPUT} inputMode="text"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  Duración (meses) <span className="text-danger">*</span>
                </label>
                <input
                  name="duracionMeses"
                  type="number"
                  min={1}
                  max={12}
                  required
                  defaultValue={editingAsig.duracionMeses}
                  className={INPUT} inputMode="numeric"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  Máximo alumnos <span className="text-danger">*</span>
                </label>
                <input
                  name="maxAlumnos"
                  type="number"
                  min={1}
                  max={300}
                  required
                  defaultValue={editingAsig.maxAlumnos ?? 30}
                  className={INPUT} inputMode="numeric"
                />
              </div>
            </div>

            <DocenteCombobox
              key={`edit-docente-${editingAsig.id}`}
              docentes={docentes}
              defaultId={editingAsig.docenteId}
              name="docenteId"
            />

            <p className="text-xs text-text-muted dark:text-gray-500">
              Puedes dejar el docente vacío para quitar la asignación.
            </p>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEditingAsig(null)}
                className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-10 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal: Asignar docente ── */}
      <Modal
        open={assigningAsig !== null}
        onClose={() => { setAssigningAsig(null); setConfirmDocente(null); }}
        title={
          assigningAsig
            ? `Asignar docente · ${assigningAsig.nombre}`
            : "Asignar docente"
        }
        description={
          assigningAsig?.codigo
            ? `Código: ${assigningAsig.codigo}`
            : undefined
        }
        size="max-w-md"
      >
        {assigningAsig && (
          <form ref={assignFormRef} action={asignarDocenteFormAction} className="space-y-4">
            <input
              type="hidden"
              name="asignaturaId"
              value={assigningAsig.id}
            />

            <DocenteCombobox
              docentes={docentes}
              defaultId={assigningAsig.docenteId}
              name="docenteId"
              onSelect={(d) => setConfirmDocente(d)}
            />

            {docentes.length === 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                No hay docentes activos disponibles para asignar.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => { setAssigningAsig(null); setConfirmDocente(null); }}
                className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!confirmDocente || docentes.length === 0 || isPending}
                onClick={() => setShowConfirm(true)}
                className="h-10 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
              >
                Guardar asignación
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Confirm dialog for docente assignment ── */}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleAssignSubmit}
        title="Confirmar asignación de docente"
        description={
          confirmDocente && assigningAsig
            ? `Vas a asignar a ${confirmDocente.nombre} ${confirmDocente.apellido} como docente responsable de la sección "${assigningAsig.nombre}". Se enviará una notificación por correo al docente.`
            : ""
        }
        confirmLabel="Confirmar asignación"
        variant="primary"
        isPending={isPending}
      />

      {/* ── Hidden form + confirm dialog for archiving ── */}
      <form ref={archiveFormRef} action={archivarAsignaturaFormAction} className="hidden">
        <input type="hidden" name="id" value={archivingAsig?.id ?? ""} />
      </form>
      <ConfirmDialog
        open={archivingAsig !== null}
        onClose={() => setArchivingAsig(null)}
        onConfirm={() => {
          setArchivingAsig(null);
          startTransition(() => { archiveFormRef.current?.requestSubmit(); });
        }}
        title="Archivar sección"
        description={
          archivingAsig
            ? `¿Archivar "${archivingAsig.nombre}"? La sección quedará inactiva y no aparecerá en las vistas activas.`
            : ""
        }
        confirmLabel="Sí, archivar"
        variant="danger"
        isPending={isPending}
      />

      {/* ── Hidden form + confirm dialog for unarchiving ── */}
      <form ref={unarchiveFormRef} action={desarchivariAsignaturaFormAction} className="hidden">
        <input type="hidden" name="id" value={unarchivingAsig?.id ?? ""} />
      </form>
      <ConfirmDialog
        open={unarchivingAsig !== null}
        onClose={() => setUnarchivingAsig(null)}
        onConfirm={() => {
          setUnarchivingAsig(null);
          startTransition(() => { unarchiveFormRef.current?.requestSubmit(); });
        }}
        title="Desarchivar sección"
        description={
          unarchivingAsig
            ? `¿Reactivar "${unarchivingAsig.nombre}"? La sección volverá a estado activo y aparecerá en las vistas operativas.`
            : ""
        }
        confirmLabel="Sí, desarchivar"
        variant="primary"
        isPending={isPending}
      />

      {/* ── Hidden form + confirm dialog for deleting ── */}
      <form ref={deleteFormRef} action={eliminarAsignaturaFormAction} className="hidden">
        <input type="hidden" name="id" value={deletingAsig?.id ?? ""} />
      </form>
      <ConfirmDialog
        open={deletingAsig !== null}
        onClose={() => setDeletingAsig(null)}
        onConfirm={() => {
          setDeletingAsig(null);
          startTransition(() => { deleteFormRef.current?.requestSubmit(); });
        }}
        title="Eliminar sección"
        description={
          deletingAsig
            ? `¿Eliminar permanentemente "${deletingAsig.nombre}"? Esta acción es irreversible y la sección dejará de aparecer en el sistema.`
            : ""
        }
        confirmLabel="Sí, eliminar"
        variant="danger"
        isPending={isPending}
      />
    </>
  );
}
