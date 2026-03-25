import Link from "next/link";

import { CreditCard, FileCheck, FileText, IdCard } from "lucide-react";

import { listarSolicitudesDocumentosAlumno } from "@/actions/solicitudes-documentos";
import { HistorialSolicitudes } from "@/components/solicitudes/HistorialSolicitudes";

const SOLICITUD_CARDS = [
  {
    href: "/alumno/solicitudes/credencial",
    Icon: IdCard,
    title: "Credencial de Alumno",
    description: "Solicita tu credencial de identificación institucional.",
    color: "from-primary/10 to-primary/5 border-primary/20 text-primary",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    href: "/alumno/solicitudes/alumno-regular",
    Icon: FileCheck,
    title: "Certificado Alumno Regular",
    description: "Genera tu certificado oficial de alumno regular.",
    color: "from-blue-50 to-blue-50/50 border-blue-200 text-blue-700 dark:from-blue-950/40 dark:to-blue-950/20 dark:border-blue-800 dark:text-blue-300",
    iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    href: "/alumno/solicitudes/tarjeta-beneficio",
    Icon: CreditCard,
    title: "Tarjeta de Beneficio",
    description: "Accede al Club de Beneficios Impulsate & Emprende.",
    color: "from-amber-50 to-amber-50/50 border-amber-200 text-amber-800 dark:from-amber-950/40 dark:to-amber-950/20 dark:border-amber-800 dark:text-amber-300",
    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
];

export const metadata = { title: "Solicitudes" };

export default async function AlumnoSolicitudesPage() {
  const solicitudes = await listarSolicitudesDocumentosAlumno();

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Solicitudes de Documentos
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Selecciona el tipo de documento que necesitas. Cada solicitud es independiente.
        </p>
      </header>

      {/* Navigation cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {SOLICITUD_CARDS.map(({ href, Icon, title, description, iconBg }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40"
          >
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-text-primary group-hover:text-primary dark:text-white dark:group-hover:text-primary-light">
                {title}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">{description}</p>
            </div>
            <span className="mt-auto text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 dark:text-primary-light">
              Ir al formulario →
            </span>
          </Link>
        ))}
      </div>

      {/* All requests history */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Todas mis solicitudes
          </h2>
          {solicitudes.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {solicitudes.length}
            </span>
          )}
        </div>
        <HistorialSolicitudes solicitudes={solicitudes} />
      </article>
    </section>
  );
}
