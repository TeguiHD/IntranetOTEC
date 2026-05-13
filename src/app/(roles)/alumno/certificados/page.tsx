import { Award } from "lucide-react";

import {
  getCertificadosAlumnoRegularDisponibles,
  getHistorialCertificadosAlumno,
} from "@/actions/certificados";

import { CertificadosAlumnoCliente } from "./CertificadosAlumnoCliente";

export const metadata = { title: "Mis Certificados" };
export const dynamic = "force-dynamic";

export default async function AlumnoCertificadosPage() {
  const [disponibles, historial] = await Promise.all([
    getCertificadosAlumnoRegularDisponibles(),
    getHistorialCertificadosAlumno(),
  ]);

  return (
    <section className="space-y-5">
      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-purple-100 p-2 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          <Award className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Certificados
          </h1>
          <p className="text-balance text-sm text-text-secondary dark:text-gray-400">
            Genera tu certificado con firma digital y código QR de validación.
          </p>
        </div>
      </header>

      <CertificadosAlumnoCliente disponibles={disponibles} historial={historial} />
    </section>
  );
}
