"use client";

import { useState } from "react";
import { crearAlumnoFormAction } from "@/actions/usuarios";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

export function AlumnoForm() {
  const [credencialTipo, setCredencialTipo] = useState<"rut" | "extranjera">("rut");

  return (
    <form action={crearAlumnoFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="credencialTipo" value={credencialTipo} />

      <div className="space-y-1">
        <label htmlFor="alumno-nombre" className="text-sm font-medium text-text-primary dark:text-gray-100">
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

      <div className="space-y-1">
        <label htmlFor="alumno-apellido" className="text-sm font-medium text-text-primary dark:text-gray-100">
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
          placeholder="Ej: Pérez"
          className={inputClass}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <span className="text-sm font-medium text-text-primary dark:text-gray-100">
          Tipo de identificación <span className="text-danger">*</span>
        </span>
        <div className="flex gap-4">
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              credencialTipo === "rut"
                ? "border-primary bg-primary/10 text-primary dark:border-primary-light dark:bg-primary/20 dark:text-primary-light"
                : "border-gray-300 text-text-secondary hover:border-gray-400 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500"
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
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              credencialTipo === "extranjera"
                ? "border-primary bg-primary/10 text-primary dark:border-primary-light dark:bg-primary/20 dark:text-primary-light"
                : "border-gray-300 text-text-secondary hover:border-gray-400 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500"
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

      {credencialTipo === "rut" ? (
        <div className="space-y-1">
          <label htmlFor="alumno-rut" className="text-sm font-medium text-text-primary dark:text-gray-100">
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
        <div className="space-y-1">
          <label htmlFor="alumno-credencial" className="text-sm font-medium text-text-primary dark:text-gray-100">
            N° de credencial <span className="text-danger">*</span>
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
          <p className="text-xs text-text-secondary dark:text-gray-400">
            Pasaporte, DNI u otro documento de identidad extranjero.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="alumno-email" className="text-sm font-medium text-text-primary dark:text-gray-100">
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

      <div className="md:col-span-2">
        <button
          type="submit"
          className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          Crear Alumno
        </button>
      </div>
    </form>
  );
}
