"use client";

import { useState } from "react";

import { Eye, EyeOff, Plus } from "lucide-react";

import { crearAdministradorFormAction } from "@/actions/usuarios";
import { Modal } from "@/components/shared/Modal";
import { RutInput } from "@/components/shared/RutInput";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20";

export function AdminCreateModal() {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rut, setRut] = useState("");
  const [isRutValid, setIsRutValid] = useState(false);

  const handleClose = () => {
    setOpen(false);
    setRut("");
    setIsRutValid(false);
    setShowPassword(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        Nuevo Administrador
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Crear Administrador"
        description="Ingresa los datos del admin. La contraseña debe cumplir con la política de seguridad."
        size="max-w-xl"
      >
        <form action={crearAdministradorFormAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="modal-admin-nombre" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                id="modal-admin-nombre"
                name="nombre"
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej: María"
                className={inputClass}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="modal-admin-apellido" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Apellido <span className="text-danger">*</span>
              </label>
              <input
                id="modal-admin-apellido"
                name="apellido"
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej: González"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="modal-admin-email" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Correo electrónico <span className="text-danger">*</span>
              </label>
              <input
                id="modal-admin-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                maxLength={180}
                placeholder="admin@ejemplo.cl"
                className={inputClass}
              />
            </div>
            <div>
              <RutInput
                id="modal-admin-rut"
                name="rut"
                value={rut}
                required
                allowForeign
                onChange={setRut}
                onValidityChange={setIsRutValid}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="modal-admin-password" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Contraseña inicial <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                id="modal-admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                placeholder="Mínimo 12 caracteres"
                className={`${inputClass} pr-11`}
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
              Debe incluir mayúscula, minúscula, número, símbolo y mínimo 12 caracteres.
            </p>
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
              disabled={!isRutValid}
              className="h-10 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md"
            >
              Crear Administrador
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
