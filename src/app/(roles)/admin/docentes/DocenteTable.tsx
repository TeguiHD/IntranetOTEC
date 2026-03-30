"use client";

import { useState, useTransition } from "react";

import { KeyRound, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  activarDocenteFormAction,
  desactivarDocenteFormAction,
  editarDocenteAction,
  eliminarDocentePermanenteFormAction,
  resetearPasswordAdminAction,
} from "@/actions/usuarios";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Modal } from "@/components/shared/Modal";
import { formatearIdentificador } from "@/lib/rut";

type DocenteRow = {
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  email: string | null;
  activo: boolean | null;
};

type DocenteTableProps = {
  docentes: DocenteRow[];
  emptyMessage?: string;
};

type PendingAction = {
  userId: string;
  name: string;
  action: "activate" | "deactivate" | "delete";
} | null;

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20";

export function DocenteTable({
  docentes,
  emptyMessage = "No hay docentes registrados aún.",
}: DocenteTableProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<DocenteRow | null>(null);
  const [isEditPending, startEditTransition] = useTransition();
  const [isResetPending, startResetTransition] = useTransition();
  const [resetResult, setResetResult] = useState<string | null>(null);
  const router = useRouter();

  const handleConfirm = () => {
    if (!pending) return;
    const formData = new FormData();
    formData.set("userId", pending.userId);
    startTransition(async () => {
      if (pending.action === "deactivate") {
        await desactivarDocenteFormAction(formData);
      } else if (pending.action === "activate") {
        await activarDocenteFormAction(formData);
      } else if (pending.action === "delete") {
        await eliminarDocentePermanenteFormAction(formData);
      }
      setPending(null);
    });
  };

  const handleResetPassword = (userId: string) => {
    startResetTransition(async () => {
      const result = await resetearPasswordAdminAction({ userId, rol: "docente" });
      if (result.ok && result.nuevaPassword) {
        setResetResult(result.nuevaPassword);
      } else {
        toast.error(!result.ok ? result.message : "No se pudo restablecer la contrasena.");
      }
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startEditTransition(async () => {
      const result = await editarDocenteAction({
        userId: formData.get("userId") as string,
        nombre: formData.get("nombre") as string,
        apellido: formData.get("apellido") as string,
        email: formData.get("email") as string,
      });
      if (result.ok) {
        toast.success("Docente actualizado correctamente.");
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.message ?? "No fue posible actualizar el docente.");
      }
    });
  };

  return (
    <>
      {docentes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
          <Search className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-text-secondary dark:text-gray-400">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 sm:hidden">
            {docentes.map((d) => (
              <div key={d.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary dark:text-white">
                      {d.nombre} {d.apellido}
                    </p>
                    <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                      {formatearIdentificador(d.rut)}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-text-secondary dark:text-gray-400">
                      {d.email ?? "-"}
                    </p>
                  </div>
                  <span
                    className={`ml-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      d.activo
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    }`}
                  >
                    {d.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(d)}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-text-primary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200 dark:hover:border-primary-light dark:hover:text-primary-light"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <ActionButton docente={d} onAction={setPending} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="px-3 py-2.5">Nombre</th>
                  <th className="px-3 py-2.5">RUT</th>
                  <th className="px-3 py-2.5">Correo</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {docentes.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                    <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                      {d.nombre} {d.apellido}
                    </td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                      {formatearIdentificador(d.rut)}
                    </td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                      {d.email ?? "-"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          d.activo
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                        }`}
                      >
                        {d.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(d)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-text-secondary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-primary-light dark:hover:text-primary-light"
                          aria-label={`Editar ${d.nombre} ${d.apellido}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <ActionButton docente={d} onAction={setPending} />
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
        onClose={() => { if (!isEditPending) { setEditing(null); setResetResult(null); } }}
        title={editing ? `Editar ${editing.nombre} ${editing.apellido}` : ""}
        size="max-w-lg"
      >
        {editing && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="userId" value={editing.id} />

            {/* Password Reset section */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-text-primary dark:text-gray-200">
                    Restablecer contraseña
                  </p>
                  <p className="text-xs text-text-muted dark:text-gray-500">
                    Genera una contraseña temporal segura. El docente debe cambiarla.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleResetPassword(editing.id)}
                  disabled={isResetPending || !!resetResult}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400"
                >
                  {isResetPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <KeyRound className="h-3 w-3" />
                  )}
                  Restablecer
                </button>
              </div>
              {resetResult && (
                <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Nueva contraseña temporal:{" "}
                    <strong className="font-mono tracking-wider">{resetResult}</strong>
                    <span className="ml-2 text-emerald-600/70 dark:text-emerald-500/70">— Informa al docente.</span>
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="edit-docente-nombre" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  Nombre <span className="text-danger">*</span>
                </label>
                <input
                  id="edit-docente-nombre"
                  name="nombre"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  defaultValue={editing.nombre}
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-docente-apellido" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  Apellido <span className="text-danger">*</span>
                </label>
                <input
                  id="edit-docente-apellido"
                  name="apellido"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  defaultValue={editing.apellido}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-docente-email" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Correo electrónico <span className="text-danger">*</span>
              </label>
              <input
                id="edit-docente-email"
                name="email"
                type="email"
                required
                maxLength={180}
                defaultValue={editing.email ?? ""}
                className={inputClass}
              />
            </div>

            <p className="text-xs text-text-muted dark:text-gray-500">
              El RUT no se puede modificar. Para cambiar la contraseña usa el botón de arriba.
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
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60"
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
        )}
      </Modal>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        isPending={isPending}
        title={
          pending?.action === "deactivate" ? "Desactivar docente" :
          pending?.action === "delete" ? "Eliminar docente definitivamente" :
          "Activar docente"
        }
        description={
          pending?.action === "deactivate"
            ? `¿Seguro que deseas desactivar a ${pending?.name}? Perderá acceso a la plataforma.`
            : pending?.action === "delete"
            ? `¿Estás seguro de eliminar a ${pending?.name}? Esta acción es IRREVERSIBLE y borrará su cuenta definitivamente.`
            : `¿Seguro que deseas reactivar a ${pending?.name}? Recuperará acceso a la plataforma.`
        }
        confirmLabel={
          pending?.action === "deactivate" ? "Desactivar" :
          pending?.action === "delete" ? "Eliminar definitivamente" :
          "Activar"
        }
        variant={pending?.action === "delete" || pending?.action === "deactivate" ? "danger" : "primary"}
      />
    </>
  );
}

function ActionButton({
  docente,
  onAction,
}: {
  docente: DocenteRow;
  onAction: (action: PendingAction) => void;
}) {
  const name = `${docente.nombre} ${docente.apellido}`;

  if (docente.activo) {
    return (
      <button
        type="button"
        onClick={() => onAction({ userId: docente.id, name, action: "deactivate" })}
        className="h-10 flex-1 rounded-xl border border-danger/30 text-sm font-medium text-danger transition-colors hover:bg-danger/10 active:bg-danger/20 dark:text-red-400 sm:h-auto sm:flex-none sm:px-3.5 sm:py-1.5 sm:text-xs"
      >
        Desactivar
      </button>
    );
  }

  return (
    <div className="flex flex-1 gap-2 sm:flex-none">
      <button
        type="button"
        onClick={() => onAction({ userId: docente.id, name, action: "activate" })}
        className="h-10 flex-1 rounded-xl border border-success/30 text-sm font-medium text-green-700 transition-colors hover:bg-success/10 active:bg-success/20 dark:text-green-400 sm:h-auto sm:flex-none sm:px-3.5 sm:py-1.5 sm:text-xs"
      >
        Activar
      </button>
      <button
        type="button"
        onClick={() => onAction({ userId: docente.id, name, action: "delete" })}
        title="Eliminar permanentemente"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-danger/20 text-danger/70 transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger active:bg-danger/20 dark:text-red-400/60 dark:hover:text-red-400 sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
