"use client";

import { useState, useTransition } from "react";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { crearAlumnoAction } from "@/actions/usuarios";
import { Modal } from "@/components/shared/Modal";
import { RutInput } from "@/components/shared/RutInput";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20";

export function AlumnoCreateModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [credencialTipo, setCredencialTipo] = useState<"rut" | "extranjera">("rut");
  const [rut, setRut] = useState("");
  const [isRutValid, setIsRutValid] = useState(false);
  const [credencialExtranjera, setCredencialExtranjera] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const resetFormState = () => {
    setCredencialTipo("rut");
    setRut("");
    setIsRutValid(false);
    setCredencialExtranjera("");
    setNombre("");
    setApellido("");
    setEmail("");
  };

  const handleClose = () => {
    if (isPending) return;
    setOpen(false);
    resetFormState();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await crearAlumnoAction({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        credencialTipo,
        rut: credencialTipo === "rut" ? rut : undefined,
        credencialExtranjera: credencialTipo === "extranjera" ? credencialExtranjera : undefined,
        email: email.trim() || undefined,
      });

      if (result.ok) {
        const msg =
          result.code === "alumno_updated"
            ? "Alumno actualizado/reactivado correctamente."
            : "Alumno creado correctamente.";
        toast.success(msg);
        setOpen(false);
        resetFormState();
        router.refresh();
      } else {
        const errorMessages: Record<string, string> = {
          invalid_input: "Datos inválidos. Verifica los campos.",
          email_conflict: "El correo ya está registrado por otro usuario.",
          invalid_name: "Nombre y apellido deben tener al menos 2 caracteres.",
          invalid_credential: "Debes indicar una credencial válida.",
          forbidden: "Tu sesión no tiene permisos de administrador.",
          conflict_race_condition: "El usuario fue registrado simultáneamente. Intenta de nuevo.",
        };
        toast.error(result.message ?? errorMessages[result.code] ?? "No fue posible crear el alumno.");
      }
    });
  };

  const isSubmitDisabled =
    isPending ||
    nombre.trim().length < 2 ||
    apellido.trim().length < 2 ||
    (credencialTipo === "rut" ? !isRutValid : credencialExtranjera.trim().length < 4);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        Nuevo Alumno
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Crear Alumno"
        description="Ingresa los datos del alumno con RUT chileno o credencial extranjera."
        size="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="modal-alumno-nombre" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                id="modal-alumno-nombre"
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej: Juan"
                className={inputClass}
                autoFocus
                value={nombre}
                inputMode="text" onChange={(e) => setNombre(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="modal-alumno-apellido" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Apellido <span className="text-danger">*</span>
              </label>
              <input
                id="modal-alumno-apellido"
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej: Pérez"
                className={inputClass}
                value={apellido}
                inputMode="text" onChange={(e) => setApellido(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Credential type selector */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Tipo de identificación <span className="text-danger">*</span>
            </span>
            <div className="flex gap-3">
              {(["rut", "extranjera"] as const).map((tipo) => (
                <label
                  key={tipo}
                  className={`flex cursor-pointer items-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                    credencialTipo === tipo
                      ? "border-primary bg-primary/10 text-primary shadow-sm dark:border-primary-light dark:bg-primary/20 dark:text-primary-light"
                      : "border-gray-200 text-text-secondary hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    value={tipo}
                    checked={credencialTipo === tipo}
                    inputMode="text" onChange={() => {
                      setCredencialTipo(tipo);
                      setRut("");
                      setIsRutValid(false);
                      setCredencialExtranjera("");
                    }}
                    className="sr-only"
                    disabled={isPending}
                  />
                  {tipo === "rut" ? "RUT chileno" : "Credencial extranjera"}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {credencialTipo === "rut" ? (
              <div>
                <RutInput
                  id="modal-alumno-rut"
                  name="rut"
                  value={rut}
                  required
                  onChange={setRut}
                  onValidityChange={setIsRutValid}
                  disabled={isPending}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="modal-alumno-credencial" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  N° de credencial <span className="text-danger">*</span>
                </label>
                <input
                  id="modal-alumno-credencial"
                  type="text"
                  required
                  minLength={4}
                  maxLength={24}
                  placeholder="Ej: A12345678"
                  className={inputClass}
                  value={credencialExtranjera}
                  inputMode="text" onChange={(event) => setCredencialExtranjera(
                      event.currentTarget.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9-]/g, "")
                        .slice(0, 24),
                    )
                  }
                  disabled={isPending}
                />
                <p className="text-xs text-text-muted dark:text-gray-500">
                  Pasaporte, DNI u otro documento extranjero.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="modal-alumno-email" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Correo (opcional)
              </label>
              <input
                id="modal-alumno-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={180}
                placeholder="alumno@ejemplo.cl"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-xs text-text-secondary dark:border-primary/20 dark:bg-primary/10 dark:text-gray-300">
            El PIN inicial del alumno se genera automáticamente con los últimos 4 dígitos de su documento.
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="h-10 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md"
            >
              {isPending ? "Creando..." : "Crear Alumno"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
