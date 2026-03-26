import { CreditCard } from "lucide-react";

import {
  obtenerPerfilAlumnoActual,
} from "@/actions/solicitudes-documentos";
import { TarjetaBeneficio } from "@/components/beneficio/TarjetaBeneficio";
import { formatearRut } from "@/lib/rut";

export const metadata = { title: "Tarjeta de Beneficio" };

export default async function SolicitudTarjetaBeneficioPage() {
  const perfil = await obtenerPerfilAlumnoActual();

  const rutDisplay = perfil?.rut
    ? perfil.rut.startsWith("EXT-")
      ? `Ext: ${perfil.rut.replace(/^EXT-/, "")}`
      : formatearRut(perfil.rut)
    : undefined;

  return (
    <section className="space-y-5">
      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-[#F5A623]/15 p-2 text-[#F5A623]">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Tarjeta de Beneficio
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Tu tarjeta del Club de Beneficios Impulsate.
          </p>
        </div>
      </header>

      {perfil ? (
        <TarjetaBeneficio
          rut={rutDisplay}
          nombre={perfil.nombre}
          apellido={perfil.apellido}
        />
      ) : (
        <p className="text-sm text-text-secondary dark:text-gray-400">
          No se pudo cargar tu información.
        </p>
      )}
    </section>
  );
}
