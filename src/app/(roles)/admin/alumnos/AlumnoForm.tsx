"use client";

import { useState } from "react";
import { crearAlumnoFormAction } from "@/actions/usuarios";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary/30";

export function AlumnoForm() {
  const [credencialTipo, setCredencialTipo] = useState<"rut" | "extranjera">("rut");

  return (
    <form action={crearAlumnoFormAction} className="mt-4 space-y-4">
      <input type="hidden" name="credencialTipo" value={credencialTipo} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="alumno-nombre" className="text-sm font-medium text-text-primary dark:text-gray-200">
            Nombre <span className="text-danger">*</span>
          </label>
          <input
            id="alumno-nombre"
            name="nombre"
            type="text"
            inputMode="text"
            required
            minLength={2}
            maxLength={80}
            placeholder="Ej: Juan"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="alumno-apellido" className="text-sm font-medium text-text-primary dark:text-gray-200">
            Apellido <span className="text-danger">*</span>
          </label>
          <input
            id="alumno-apellido"
            name="apellido"
            type="text"
            inputMode="text"
            required
            minLength={2}
            maxLength={80}
            placeholder="Ej: Perez"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-text-primary dark:text-gray-200">
          Tipo de identificacion <span className="text-danger">*</span>
        </span>
        <div className="flex gap-3">
          <label
            className={`flex cursor-pointer items-center rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
              credencialTipo === "rut"
                ? "border-primary bg-primary/10 text-primary shadow-sm dark:border-primary-light dark:bg-primary/20 dark:text-primary-light"
                : "border-gray-200 text-text-secondary hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
            }`}
          >
            <input
              type="radio"
              name="credencialTipoRadio"
              value="rut"
              checked={credencialTipo === "rut"}
              onChange={() => setCredencialTipo("rut")}
              className="sr-only"
            />
            RUT chileno
          </label>
          <label
            className={`flex cursor-pointer items-center rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
              credencialTipo === "extranjera"
                ? "border-primary bg-primary/10 text-primary shadow-sm dark:border-primary-light dark:bg-primary/20 dark:text-primary-light"
                : "border-gray-200 text-text-secondary hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
            }`}
          >
            <input
              type="radio"
              name="credencialTipoRadio"
              value="extranjera"
              checked={credencialTipo === "extranjera"}
              onChange={() => setCredencialTipo("extranjera")}
              className="sr-only"
            />
            Credencial extranjera
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {credencialTipo === "rut" ? (
          <div className="space-y-1.5">
            <label htmlFor="alumno-rut" className="text-sm font-medium text-text-primary dark:text-gray-200">
              RUT <span className="text-danger">*</span>
            </label>
            <input
              id="alumno-rut"
              name="rut"
              type="text"
              inputMode="numeric"
              required
              minLength={8}
              maxLength={12}
              placeholder="12.345.678-5"
              className={inputClass}
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="alumno-credencial" className="text-sm font-medium text-text-primary dark:text-gray-200">
              N de credencial <span className="text-danger">*</span>
            </label>
            <input
              id="alumno-credencial"
              name="credencialExtranjera"
              type="text"
              required
              minLength={4}
              maxLength={24}
              placeholder="Ej: A12345678"
              className={inputClass}
            />
            <p className="text-xs text-text-muted dark:text-gray-500">
              Pasaporte, DNI u otro documento de identidad extranjero.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="alumno-email" className="text-sm font-medium text-text-primary dark:text-gray-200">
            Correo (opcional)
          </label>
          <input
            id="alumno-email"
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

      <button
        type="submit"
        className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] sm:w-auto"
      >
        Crear Alumno
      </button>
    </form>
  );
}
