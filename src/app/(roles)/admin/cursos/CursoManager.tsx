"use client";

import { useState, useTransition } from "react";

import { BookOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  crearCurso,
  editarCurso,
  eliminarCurso,
  toggleActivoCurso,
} from "@/actions/cursos";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Modal } from "@/components/shared/Modal";

// re-export para usar dentro del componente anidado sin re-importar
const ModalComp = Modal;

type CursoRow = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  horasTeoricas: number | null;
  horasPracticas: number | null;
  activo: boolean | null;
  totalSecciones: number;
};

type Props = {
  cursos: CursoRow[];
  searchQuery: string;
  mode: "header-button" | "table";
};

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20";

const numberInputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

type FormState = {
  nombre: string;
  codigo: string;
  descripcion: string;
  horasTeoricas: number;
  horasPracticas: number;
};

const emptyForm: FormState = {
  nombre: "",
  codigo: "",
  descripcion: "",
  horasTeoricas: 0,
  horasPracticas: 0,
};

export function CursoManager({ cursos, searchQuery, mode }: Props) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CursoRow | null>(null);
  const [deleting, setDeleting] = useState<CursoRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const router = useRouter();

  const openCreate = () => {
    setForm(emptyForm);
    setCreating(true);
  };

  const openEdit = (curso: CursoRow) => {
    setForm({
      nombre: curso.nombre,
      codigo: curso.codigo,
      descripcion: curso.descripcion ?? "",
      horasTeoricas: curso.horasTeoricas ?? 0,
      horasPracticas: curso.horasPracticas ?? 0,
    });
    setEditing(curso);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await editarCurso(editing.id, form)
        : await crearCurso(form);

      if (result.ok) {
        toast.success(editing ? "Curso actualizado." : "Curso creado.");
        setCreating(false);
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.message ?? "No fue posible guardar el curso.");
      }
    });
  };

  const handleToggleActivo = (id: string) => {
    startTransition(async () => {
      const result = await toggleActivoCurso(id);
      if (result.ok) {
        toast.success(result.code === "curso_activado" ? "Curso activado." : "Curso desactivado.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Error al cambiar estado.");
      }
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    startDeleteTransition(async () => {
      const result = await eliminarCurso(deleting.id);
      if (result.ok) {
        toast.success("Curso eliminado.");
        setDeleting(null);
        router.refresh();
      } else {
        toast.error(result.message ?? "No fue posible eliminar el curso.");
      }
    });
  };

  if (mode === "header-button") {
    return (
      <>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Nuevo Curso
        </button>

        <CursoFormModal
          open={creating}
          onClose={() => setCreating(false)}
          title="Nuevo Curso"
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          isPending={isPending}
          inputClass={inputClass}
          numberInputClass={numberInputClass}
        />
      </>
    );
  }

  return (
    <>
      {/* Buscador */}
      <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
        <form action="/admin/cursos" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            name="q"
            type="search"
            defaultValue={searchQuery}
            maxLength={80}
            placeholder="Buscar por nombre o código"
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" inputMode="search"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-11 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg"
            >
              Buscar
            </button>
            {searchQuery && (
              <a href="/admin/cursos" className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                Limpiar
              </a>
            )}
          </div>
        </form>
      </div>

      {/* Tabla / Empty */}
      {cursos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-text-secondary dark:text-gray-400">
            {searchQuery ? `Sin resultados para "${searchQuery}".` : "No hay cursos registrados aún."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {cursos.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary dark:text-white">{c.nombre}</p>
                    <p className="mt-0.5 font-mono text-xs text-text-secondary dark:text-gray-400">{c.codigo}</p>
                    <p className="mt-1 text-xs text-text-muted dark:text-gray-500">
                      {c.horasTeoricas}h teóricas · {c.horasPracticas}h prácticas · {c.totalSecciones} sección(es)
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${c.activo ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => openEdit(c)} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-sm font-medium text-text-primary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button type="button" onClick={() => handleToggleActivo(c.id)} disabled={isPending} className="flex h-10 flex-1 items-center justify-center rounded-xl border border-gray-200 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                    {c.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="px-3 py-2.5">Nombre</th>
                  <th className="px-3 py-2.5">Código</th>
                  <th className="px-3 py-2.5">Horas</th>
                  <th className="px-3 py-2.5">Secciones</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {cursos.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                    <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">{c.nombre}</td>
                    <td className="px-3 py-3 font-mono text-xs text-text-secondary dark:text-gray-400">{c.codigo}</td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                      {c.horasTeoricas}T + {c.horasPracticas}P
                    </td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-400">{c.totalSecciones}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${c.activo ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-text-secondary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-primary-light dark:hover:text-primary-light"
                          aria-label={`Editar ${c.nombre}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(c.id)}
                          disabled={isPending}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                        >
                          {c.activo ? "Desactivar" : "Activar"}
                        </button>
                        {c.totalSecciones === 0 && (
                          <button
                            type="button"
                            onClick={() => setDeleting(c)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-danger/20 text-danger/70 transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger dark:text-red-400/60 dark:hover:text-red-400"
                            aria-label={`Eliminar ${c.nombre}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
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
      <CursoFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Editar: ${editing?.nombre ?? ""}`}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isPending={isPending}
        inputClass={inputClass}
        numberInputClass={numberInputClass}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isPending={isDeletePending}
        title="Eliminar curso"
        description={`¿Seguro que deseas eliminar "${deleting?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </>
  );
}

function CursoFormModal({
  open,
  onClose,
  title,
  form,
  setForm,
  onSubmit,
  isPending,
  inputClass,
  numberInputClass,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  inputClass: string;
  numberInputClass: string;
}) {
  return (
    <ModalComp open={open} onClose={onClose} title={title} size="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="curso-nombre" className="block text-sm font-medium text-text-primary dark:text-gray-200">
            Nombre del curso <span className="text-danger">*</span>
          </label>
          <input
            id="curso-nombre"
            type="text"
            required
            minLength={2}
            maxLength={120}
            value={form.nombre}
            inputMode="text" onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Operación de Grúa Horquilla"
            className={inputClass}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="curso-codigo" className="block text-sm font-medium text-text-primary dark:text-gray-200">
            Código <span className="text-danger">*</span>
          </label>
          <input
            id="curso-codigo"
            type="text"
            required
            minLength={2}
            maxLength={20}
            value={form.codigo}
            inputMode="text" onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
            placeholder="Ej: GRUA-HORK"
            className={inputClass}
          />
          <p className="text-xs text-text-muted dark:text-gray-500">Solo letras, números, guión. Se usa para identificar el curso.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="curso-desc" className="block text-sm font-medium text-text-primary dark:text-gray-200">
            Descripción (opcional)
          </label>
          <textarea
            id="curso-desc"
            rows={3}
            maxLength={500}
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Breve descripción del curso…"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="curso-ht" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Horas teóricas
            </label>
            <input
              id="curso-ht"
              type="number"
              min={0}
              max={9999}
              value={form.horasTeoricas}
              inputMode="numeric" onChange={(e) => setForm({ ...form, horasTeoricas: Number(e.target.value) })}
              className={numberInputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="curso-hp" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Horas prácticas
            </label>
            <input
              id="curso-hp"
              type="number"
              min={0}
              max={9999}
              value={form.horasPracticas}
              inputMode="numeric" onChange={(e) => setForm({ ...form, horasPracticas: Number(e.target.value) })}
              className={numberInputClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : "Guardar"}
          </button>
        </div>
      </form>
    </ModalComp>
  );
}
