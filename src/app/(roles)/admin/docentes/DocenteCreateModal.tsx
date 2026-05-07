"use client";

import { useState, useTransition } from "react";

import { Eye, EyeOff, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { crearDocenteAction } from "@/actions/usuarios";
import { Modal } from "@/components/shared/Modal";
import { RutInput } from "@/components/shared/RutInput";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20";

const CODE_MESSAGES: Record<string, string> = {
  docente_created: "Docente creado exitosamente.",
  docente_updated: "Docente restaurado y actualizado.",
  email_conflict: "El correo ya está en uso. Si esta persona es alumno, usa un correo distinto para su cuenta docente.",
  invalid_rut: "El RUT ingresado no es válido.",
  invalid_email: "El correo ingresado no es válido.",
  invalid_password_policy: "La contraseña no cumple con la política de seguridad.",
  invalid_name: "Nombre o apellido inválidos.",
  invalid_input: "Datos inválidos para crear docente.",
  docente_mutation_failed: "No fue posible crear el docente. Intenta nuevamente.",
  forbidden: "No tienes permisos para esta acción.",
};

export function DocenteCreateModal() {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rut, setRut] = useState("");
  const [isRutValid, setIsRutValid] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    setOpen(false);
    setRut("");
    setIsRutValid(false);
    setShowPassword(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    const nombre = (formData.get("nombre") as string)?.trim() ?? "";
    const apellido = (formData.get("apellido") as string)?.trim() ?? "";
    const email = (formData.get("email") as string)?.trim() ?? "";
    const password = (formData.get("password") as string) ?? "";

    if (!nombre || !apellido || !email || !rut || !password) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await crearDocenteAction({
          nombre,
          apellido,
          email,
          rut,
          password,
        });

        if (result.ok) {
          toast.success(CODE_MESSAGES[result.code] ?? "Docente creado exitosamente.");
          form.reset();
          handleClose();
          window.location.href = `/admin/docentes?state=${result.code}`;
        } else {
          toast.error(CODE_MESSAGES[result.code] ?? result.message ?? "Error al crear docente.");
        }
      } catch {
        toast.error("Error de conexión. Intenta nuevamente.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        Nuevo Docente
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Crear Docente"
        description="Ingresa los datos del docente. La contraseña debe cumplir con la política de seguridad."
        size="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="modal-docente-nombre" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                id="modal-docente-nombre"
                name="nombre"
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej: María"
                className={inputClass}
                autoFocus
                disabled={isPending} inputMode="text"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="modal-docente-apellido" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Apellido <span className="text-danger">*</span>
              </label>
              <input
                id="modal-docente-apellido"
                name="apellido"
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej: González"
                className={inputClass}
                disabled={isPending} inputMode="text"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="modal-docente-email" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Correo electrónico <span className="text-danger">*</span>
              </label>
              <input
                id="modal-docente-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                maxLength={180}
                placeholder="docente@ejemplo.cl"
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div>
              <RutInput
                id="modal-docente-rut"
                name="rut"
                value={rut}
                required
                allowForeign
                disabled={isPending}
                onChange={setRut}
                onValidityChange={setIsRutValid}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="modal-docente-password" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Contraseña inicial <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                id="modal-docente-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                placeholder="Mínimo 8 caracteres"
                className={`${inputClass} pr-11`}
                disabled={isPending} inputMode="text"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text-primary dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-text-muted dark:text-gray-500">
              Mínimo 8 caracteres, letras y números.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !isRutValid}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando…
                </>
              ) : (
                "Crear Docente"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
