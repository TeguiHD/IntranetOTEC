"use client";

import { useState, useTransition } from "react";

import { CheckSquare, KeyRound, Loader2, Pencil, Search, Trash2, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  activarAlumnoFormAction,
  cambiarEstadoAlumno,
  desactivarAlumnosMasivoFormAction,
  desactivarAlumnoFormAction,
  editarAlumnoAction,
  eliminarAlumnosMasivoFormAction,
  eliminarAlumnoPermanenteFormAction,
  resetearPasswordAdminAction,
} from "@/actions/usuarios";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Modal } from "@/components/shared/Modal";
import { formatearIdentificador } from "@/lib/rut";

type EstadoAlumno = "activo" | "egresado" | "retirado" | "suspendido" | "desertor";

type AlumnoRow = {
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  email: string | null;
  activo: boolean | null;
  estadoAlumno: EstadoAlumno | null;
  totalMatriculas?: number;
  totalCertificados?: number;
};

type AlumnoTableProps = {
  alumnos: AlumnoRow[];
  emptyMessage?: string;
};

type PendingAction = {
  userId: string;
  name: string;
  action: "activate" | "deactivate" | "delete";
} | {
  userIds: string[];
  count: number;
  action: "deactivate_bulk" | "delete_bulk";
} | null;

const ESTADO_ALUMNO_CONFIG: Record<EstadoAlumno, { label: string; cls: string }> = {
  activo:     { label: "Activo",      cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
  egresado:   { label: "Egresado",    cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  retirado:   { label: "Retirado",    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  suspendido: { label: "Suspendido",  cls: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
  desertor:   { label: "Desertor",    cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
};

function EstadoBadge({ estado }: { estado: EstadoAlumno | null }) {
  const cfg = estado ? ESTADO_ALUMNO_CONFIG[estado] : null;
  if (!cfg) return <span className="text-xs text-text-muted dark:text-gray-500">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20";

export function AlumnoTable({
  alumnos,
  emptyMessage = "No hay alumnos registrados aún.",
}: AlumnoTableProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<AlumnoRow | null>(null);
  const [isEditPending, startEditTransition] = useTransition();
  const [isResetPending, startResetTransition] = useTransition();
  const [isEstadoPending, startEstadoTransition] = useTransition();
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const router = useRouter();
  const visibleIds = alumnos.map((alumno) => alumno.id);
  const selectedCount = selectedIds.length;
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const pendingName = pending && "name" in pending ? pending.name : "este alumno";

  const toggleSelected = (userId: string) => {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      if (visibleIds.every((id) => current.includes(id))) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const handleConfirm = () => {
    if (!pending) return;
    const formData = new FormData();
    startTransition(async () => {
      if (pending.action === "deactivate_bulk") {
        pending.userIds.forEach((userId) => formData.append("userId", userId));
        await desactivarAlumnosMasivoFormAction(formData);
      } else if (pending.action === "delete_bulk") {
        pending.userIds.forEach((userId) => formData.append("userId", userId));
        await eliminarAlumnosMasivoFormAction(formData);
      } else if (pending.action === "deactivate") {
        formData.set("userId", pending.userId);
        await desactivarAlumnoFormAction(formData);
      } else if (pending.action === "activate") {
        formData.set("userId", pending.userId);
        await activarAlumnoFormAction(formData);
      } else if (pending.action === "delete") {
        formData.set("userId", pending.userId);
        await eliminarAlumnoPermanenteFormAction(formData);
      }
      clearSelection();
      setPending(null);
    });
  };

  const handleResetPin = (userId: string) => {
    startResetTransition(async () => {
      const result = await resetearPasswordAdminAction({ userId, rol: "alumno" });
      if (result.ok && result.nuevaPassword) {
        setResetResult(result.nuevaPassword);
      } else {
        toast.error(!result.ok ? result.message : "No se pudo restablecer el PIN.");
      }
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startEditTransition(async () => {
      const result = await editarAlumnoAction({
        userId: formData.get("userId") as string,
        nombre: formData.get("nombre") as string,
        apellido: formData.get("apellido") as string,
        email: (formData.get("email") as string) || undefined,
      });
      if (result.ok) {
        toast.success("Alumno actualizado correctamente.");
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.message ?? "No fue posible actualizar el alumno.");
      }
    });
  };

  const handleCambiarEstado = (nuevoEstado: EstadoAlumno, motivo?: string) => {
    if (!editing) return;
    startEstadoTransition(async () => {
      const result = await cambiarEstadoAlumno(editing.id, nuevoEstado, motivo);
      if (result.ok) {
        toast.success("Estado del alumno actualizado.");
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.message ?? "No fue posible cambiar el estado.");
      }
    });
  };

  return (
    <>
      {alumnos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
          <Search className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-text-secondary dark:text-gray-400">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAllVisible}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-primary-light dark:hover:text-primary-light"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  {allVisibleSelected ? "Quitar visibles" : "Seleccionar visibles"}
                </button>
                <span className="text-xs font-medium text-text-secondary dark:text-gray-400">
                  {selectedCount > 0
                    ? `${selectedCount} alumno${selectedCount === 1 ? "" : "s"} seleccionado${selectedCount === 1 ? "" : "s"}`
                    : "Selecciona alumnos para acciones masivas"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={() =>
                    setPending({
                      userIds: selectedIds,
                      count: selectedCount,
                      action: "deactivate_bulk",
                    })
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-300 px-3 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                >
                  <UserX className="h-3.5 w-3.5" />
                  Desactivar seleccionados
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={() =>
                    setPending({
                      userIds: selectedIds,
                      count: selectedCount,
                      action: "delete_bulk",
                    })
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-danger/30 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Baja seleccionados
                </button>
              </div>
            </div>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 sm:hidden">
            {alumnos.map((a) => (
              <div key={a.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="flex items-start justify-between gap-3">
                  <label className="mt-1 inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      inputMode="text" onChange={() => toggleSelected(a.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      aria-label={`Seleccionar ${a.nombre} ${a.apellido}`}
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary dark:text-white">
                      {a.nombre} {a.apellido}
                    </p>
                    <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                      {formatearIdentificador(a.rut)}
                    </p>
                    {a.email && (
                      <p className="mt-0.5 truncate text-sm text-text-secondary dark:text-gray-400">
                        {a.email}
                      </p>
                    )}
                    <p className="mt-1 text-xs font-medium text-primary dark:text-primary-light">
                      {a.totalMatriculas ?? 0} matrícula(s) · {a.totalCertificados ?? 0} certificado(s)
                    </p>
                  </div>
                  <EstadoBadge estado={a.estadoAlumno} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(a)}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-text-primary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200 dark:hover:border-primary-light dark:hover:text-primary-light"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <ActionButton alumno={a} onAction={setPending} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      aria-label="Seleccionar alumnos visibles" inputMode="text"
                    />
                  </th>
                  <th className="px-3 py-2.5">Nombre</th>
                  <th className="px-3 py-2.5">RUT / Credencial</th>
                  <th className="px-3 py-2.5">Ficha académica</th>
                  <th className="px-3 py-2.5">Correo</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {alumnos.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(a.id)}
                        inputMode="text" onChange={() => toggleSelected(a.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        aria-label={`Seleccionar ${a.nombre} ${a.apellido}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                      {a.nombre} {a.apellido}
                    </td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                      {formatearIdentificador(a.rut)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                          {a.totalMatriculas ?? 0} matrícula(s)
                        </span>
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {a.totalCertificados ?? 0} docs
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                      {a.email ?? "-"}
                    </td>
                    <td className="px-3 py-3">
                      <EstadoBadge estado={a.estadoAlumno} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(a)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-text-secondary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-primary-light dark:hover:text-primary-light"
                          aria-label={`Editar ${a.nombre} ${a.apellido}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <ActionButton alumno={a} onAction={setPending} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit Modal */}
      <Modal
        open={editing !== null}
        onClose={() => { if (!isEditPending && !isEstadoPending) { setEditing(null); setResetResult(null); } }}
        title={editing ? `Editar ${editing.nombre} ${editing.apellido}` : ""}
        size="max-w-lg"
      >
        {editing && (
          <div className="space-y-5">
            {/* Estado del alumno */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
              <p className="mb-2 text-xs font-semibold text-text-primary dark:text-gray-200">
                Estado académico
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(ESTADO_ALUMNO_CONFIG) as [EstadoAlumno, { label: string; cls: string }][]).map(([estado, cfg]) => (
                  <button
                    key={estado}
                    type="button"
                    disabled={isEstadoPending || editing.estadoAlumno === estado}
                    onClick={() => handleCambiarEstado(estado)}
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-[background-color,border-color,color,box-shadow,opacity,transform] disabled:cursor-not-allowed ${
                      editing.estadoAlumno === estado
                        ? `${cfg.cls} ring-2 ring-offset-1 ring-current`
                        : "border border-gray-200 bg-white text-text-secondary hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                    aria-pressed={editing.estadoAlumno === estado}
                    aria-label={`Cambiar estado a ${cfg.label}`}
                  >
                    {isEstadoPending && editing.estadoAlumno !== estado ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : null}
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input type="hidden" name="userId" value={editing.id} />

              {/* PIN Reset section */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-text-primary dark:text-gray-200">
                      Restablecer PIN de acceso
                    </p>
                    <p className="text-xs text-text-muted dark:text-gray-500">
                      Vuelve al PIN predeterminado (últimos 4 dígitos del RUT).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetPin(editing.id)}
                    disabled={isResetPending || !!resetResult}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400"
                  >
                    {isResetPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <KeyRound className="h-3 w-3" />
                    )}
                    Restablecer PIN
                  </button>
                </div>
                {resetResult && (
                  <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Nuevo PIN: <strong className="font-mono text-sm tracking-widest">{resetResult}</strong>
                      <span className="ml-2 text-emerald-600/70 dark:text-emerald-500/70">— Informa al alumno.</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="edit-alumno-nombre" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                    Nombre <span className="text-danger">*</span>
                  </label>
                  <input
                    id="edit-alumno-nombre"
                    name="nombre"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    defaultValue={editing.nombre}
                    className={inputClass}
                    autoFocus inputMode="text"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-alumno-apellido" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                    Apellido <span className="text-danger">*</span>
                  </label>
                  <input
                    id="edit-alumno-apellido"
                    name="apellido"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    defaultValue={editing.apellido}
                    className={inputClass} inputMode="text"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-alumno-email" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  Correo electrónico (opcional)
                </label>
                <input
                  id="edit-alumno-email"
                  name="email"
                  type="email"
                  maxLength={180}
                  defaultValue={editing.email ?? ""}
                  placeholder="alumno@ejemplo.cl"
                  className={inputClass} inputMode="email"
                />
              </div>

              <p className="text-xs text-text-muted dark:text-gray-500">
                El RUT / credencial extranjera no se puede modificar desde este formulario.
              </p>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={isEditPending}
                  className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditPending}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60"
                >
                  {isEditPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        isPending={isPending}
        title={
          pending?.action === "deactivate_bulk" ? "Desactivar seleccionados" :
          pending?.action === "delete_bulk" ? "Aplicar baja masiva" :
          pending?.action === "deactivate" ? "Desactivar alumno" :
          pending?.action === "delete" ? "Aplicar baja definitiva al alumno" :
          "Activar alumno"
        }
        description={
          pending?.action === "deactivate_bulk"
            ? `Se desactivara el acceso de ${pending.count} alumno(s) seleccionado(s). Podras reactivarlos despues.`
            : pending?.action === "delete_bulk"
            ? `Se aplicara baja definitiva logica a ${pending.count} alumno(s) seleccionado(s). Se cerraran sus matriculas activas y dejaran de aparecer en el padron normal.`
            : pending?.action === "deactivate"
            ? `¿Seguro que deseas desactivar a ${pendingName}? Perderá acceso a la plataforma.`
            : pending?.action === "delete"
            ? `¿Seguro que deseas aplicar baja definitiva a ${pendingName}? No se borrará físicamente, pero quedará inactivo y oculto en operación normal.`
            : `¿Seguro que deseas reactivar a ${pendingName}? Recuperará acceso a la plataforma.`
        }
        confirmLabel={
          pending?.action === "deactivate_bulk" ? "Desactivar seleccionados" :
          pending?.action === "delete_bulk" ? "Aplicar baja masiva" :
          pending?.action === "deactivate" ? "Desactivar" :
          pending?.action === "delete" ? "Aplicar baja" :
          "Activar"
        }
        variant={pending?.action === "deactivate_bulk" || pending?.action === "delete_bulk" || pending?.action === "delete" || pending?.action === "deactivate" ? "danger" : "primary"}
      />
    </>
  );
}

function ActionButton({
  alumno,
  onAction,
}: {
  alumno: AlumnoRow;
  onAction: (action: PendingAction) => void;
}) {
  const name = `${alumno.nombre} ${alumno.apellido}`;

  if (alumno.activo) {
    return (
      <div className="flex flex-1 gap-2 sm:flex-none">
        <button
          type="button"
          onClick={() => onAction({ userId: alumno.id, name, action: "deactivate" })}
          className="h-10 flex-1 rounded-xl border border-danger/30 text-sm font-medium text-danger transition-colors hover:bg-danger/10 active:bg-danger/20 dark:text-red-400 sm:h-auto sm:flex-none sm:px-3.5 sm:py-1.5 sm:text-xs"
        >
          Desactivar
        </button>
        <button
          type="button"
          onClick={() => onAction({ userId: alumno.id, name, action: "delete" })}
          title="Aplicar baja definitiva"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-danger/20 text-danger/70 transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger active:bg-danger/20 dark:text-red-400/60 dark:hover:text-red-400 sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-2 sm:flex-none">
      <button
        type="button"
        onClick={() => onAction({ userId: alumno.id, name, action: "activate" })}
        className="h-10 flex-1 rounded-xl border border-success/30 text-sm font-medium text-green-700 transition-colors hover:bg-success/10 active:bg-success/20 dark:text-green-400 sm:h-auto sm:flex-none sm:px-3.5 sm:py-1.5 sm:text-xs"
      >
        Activar
      </button>
      <button
        type="button"
        onClick={() => onAction({ userId: alumno.id, name, action: "delete" })}
        title="Aplicar baja definitiva"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-danger/20 text-danger/70 transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger active:bg-danger/20 dark:text-red-400/60 dark:hover:text-red-400 sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
