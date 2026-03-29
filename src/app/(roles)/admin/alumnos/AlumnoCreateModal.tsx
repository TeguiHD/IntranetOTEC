"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { crearAlumnoFormAction } from "@/actions/usuarios";
import { Modal } from "@/components/shared/Modal";
import { RutInput } from "@/components/shared/RutInput";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20";

export function AlumnoCreateModal() {
  const [open, setOpen] = useState(false);
  const [credencialTipo, setCredencialTipo] = useState<"rut" | "extranjera">("rut");
  const [rut, setRut] = useState("");
  const [isRutValid, setIsRutValid] = useState(false);
  const [credencialExtranjera, setCredencialExtranjera] = useState("");

  const resetFormState = () => {
    setCredencialTipo("rut");
    setRut("");
    setIsRutValid(false);
    setCredencialExtranjera("");
  };

  const handleClose = () => {
    setOpen(false);
    resetFormState();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
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
        <form action={crearAlumnoFormAction} className="space-y-4">
          <input type="hidden" name="credencialTipo" value={credencialTipo} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="modal-alumno-nombre" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                id="modal-alumno-nombre"
                name="nombre"
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej: Juan"
                className={inputClass}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="modal-alumno-apellido" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Apellido <span className="text-danger">*</span>
              </label>
              <input
                id="modal-alumno-apellido"
                name="apellido"
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej: Pérez"
                className={inputClass}
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
                    name="credencialTipoRadio"
                    value={tipo}
                    checked={credencialTipo === tipo}
                    onChange={() => {
                      setCredencialTipo(tipo);
                      setRut("");
                      setIsRutValid(false);
                      setCredencialExtranjera("");
                    }}
                    className="sr-only"
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
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="modal-alumno-credencial" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                  N° de credencial <span className="text-danger">*</span>
                </label>
                <input
                  id="modal-alumno-credencial"
                  name="credencialExtranjera"
                  type="text"
                  required
                  minLength={4}
                  maxLength={24}
                  placeholder="Ej: A12345678"
                  className={inputClass}
                  value={credencialExtranjera}
                  onChange={(event) =>
                    setCredencialExtranjera(
                      event.currentTarget.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9-]/g, "")
                        .slice(0, 24),
                    )
                  }
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
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={180}
                placeholder="alumno@ejemplo.cl"
                className={inputClass}
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
              className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={credencialTipo === "rut" ? !isRutValid : credencialExtranjera.trim().length < 4}
              className="h-10 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md"
            >
              Crear Alumno
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
