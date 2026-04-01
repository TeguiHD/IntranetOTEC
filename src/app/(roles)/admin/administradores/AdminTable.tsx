"use client";

import { useState, useTransition } from "react";

import { Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  activarAdministradorFormAction,
  desactivarAdministradorFormAction,
  editarAdministradorAction,
  eliminarAdministradorPermanenteFormAction,
} from "@/actions/usuarios";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Modal } from "@/components/shared/Modal";
import { formatearIdentificador } from "@/lib/rut";

type AdministradorRow = {
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  email: string | null;
  activo: boolean | null;
};

type AdminTableProps = {
  administradores: AdministradorRow[];
  emptyMessage?: string;
};

type PendingAction = {
  userId: string;
  name: string;
  action: "activate" | "deactivate" | "delete";
} | null;

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20";

export function AdminTable({
  administradores,
  emptyMessage = "No hay administradores registrados aún.",
}: AdminTableProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<AdministradorRow | null>(null);
  const [isEditPending, startEditTransition] = useTransition();
  const router = useRouter();

  const handleConfirm = () => {
    if (!pending) return;
    const formData = new FormData();
    formData.set("userId", pending.userId);
    startTransition(async () => {
      if (pending.action === "deactivate") {
        await desactivarAdministradorFormAction(formData);
      } else if (pending.action === "delete") {
        await eliminarAdministradorPermanenteFormAction(formData);
      } else {
        await activarAdministradorFormAction(formData);
      }
      setPending(null);
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startEditTransition(async () => {
      const result = await editarAdministradorAction({
        userId: formData.get("userId") as string,
        nombre: formData.get("nombre") as string,
        apellido: formData.get("apellido") as string,
        email: formData.get("email") as string,
      });
      if (result.ok) {
        toast.success("Administrador actualizado correctamente.");
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.message ?? "No fue posible actualizar el administrador.");
      }
    });
  };

  return (
    <>
      {administradores.length === 0 ? (
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
            {administradores.map((d) => (
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
                  <ActionButton admin={d} onAction={setPending} />
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
                {administradores.map((d) => (
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
                        <ActionButton admin={d} onAction={setPending} />
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
        onClose={() => !isEditPending && setEditing(null)}
        title={editing ? `Editar ${editing.nombre} ${editing.apellido}` : ""}
        size="max-w-lg"
      >
        {editing && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="userId" value={editing.id} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="edit-admin-nombre" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  Nombre <span className="text-danger">*</span>
                </label>
                <input
                  id="edit-admin-nombre"
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
                <label htmlFor="edit-admin-apellido" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  Apellido <span className="text-danger">*</span>
                </label>
                <input
                  id="edit-admin-apellido"
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
              <label htmlFor="edit-admin-email" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Correo electrónico <span className="text-danger">*</span>
              </label>
              <input
                id="edit-admin-email"
                name="email"
                type="email"
                required
                maxLength={180}
                defaultValue={editing.email ?? ""}
                className={inputClass}
              />
            </div>

            <p className="text-xs text-text-muted dark:text-gray-500">
              El RUT y la contraseña no se pueden modificar desde este formulario.
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
          pending?.action === "deactivate"
            ? "Desactivar admin"
            : pending?.action === "delete"
              ? "Eliminar admin"
              : "Activar admin"
        }
        description={
          pending?.action === "deactivate"
            ? `¿Seguro que deseas desactivar a ${pending?.name}? Perderá acceso a la plataforma.`
            : pending?.action === "delete"
              ? `¿Seguro que deseas eliminar permanentemente a ${pending?.name}? Esta acción no se puede deshacer.`
              : `¿Seguro que deseas reactivar a ${pending?.name}? Recuperará acceso a la plataforma.`
        }
        confirmLabel={
          pending?.action === "deactivate"
            ? "Desactivar"
            : pending?.action === "delete"
              ? "Eliminar"
              : "Activar"
        }
        variant={pending?.action === "delete" || pending?.action === "deactivate" ? "danger" : "primary"}
      />
    </>
  );
}

function ActionButton({
  admin,
  onAction,
}: {
  admin: AdministradorRow;
  onAction: (action: PendingAction) => void;
}) {
  const name = `${admin.nombre} ${admin.apellido}`;

  if (admin.activo) {
    return (
      <button
        type="button"
        onClick={() =>
          onAction({ userId: admin.id, name, action: "deactivate" })
        }
        className="h-10 flex-1 rounded-xl border border-danger/30 text-sm font-medium text-danger transition-colors hover:bg-danger/10 active:bg-danger/20 dark:text-red-400 sm:h-auto sm:flex-none sm:px-3.5 sm:py-1.5 sm:text-xs"
      >
        Desactivar
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onAction({ userId: admin.id, name, action: "activate" })}
        className="h-10 flex-1 rounded-xl border border-success/30 text-sm font-medium text-green-700 transition-colors hover:bg-success/10 active:bg-success/20 dark:text-green-400 sm:h-auto sm:flex-none sm:px-3.5 sm:py-1.5 sm:text-xs"
      >
        Activar
      </button>
      <button
        type="button"
        onClick={() => onAction({ userId: admin.id, name, action: "delete" })}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-danger/30 text-danger transition-colors hover:bg-danger/10 active:bg-danger/20 dark:text-red-400 sm:h-8 sm:w-8 sm:rounded-lg"
        aria-label={`Eliminar ${name}`}
        title="Eliminar permanentemente"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
