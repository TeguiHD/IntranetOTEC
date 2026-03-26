import { and, eq, isNull } from "drizzle-orm";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { asignaturas, matriculas, solicitudesDocumentos, usuarios } from "@/db/schema";
import { PrintButton } from "@/components/shared/PrintButton";
import { formatearRut } from "@/lib/rut";

export const metadata = { title: "Certificado de Alumno Regular" };

type SearchParams = { solicitudId?: string };
type Props = { searchParams?: Promise<SearchParams> };

export default async function CertificadoAlumnoRegularPage({ searchParams }: Props) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const db = getDb();
  const params: SearchParams = await (searchParams ?? Promise.resolve<SearchParams>({}));

  // Buscar datos del alumno
  const [alumno] = await db
    .select({ nombre: usuarios.nombre, apellido: usuarios.apellido, rut: usuarios.rut })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1);

  // Si viene un solicitudId, verificar que pertenece al alumno y obtener propósito
  let proposito: string | null = null;
  let fechaSolicitud: Date | null = null;

  if (params.solicitudId) {
    const [sol] = await db
      .select({ observacion: solicitudesDocumentos.observacion, createdAt: solicitudesDocumentos.createdAt })
      .from(solicitudesDocumentos)
      .where(
        and(
          eq(solicitudesDocumentos.id, params.solicitudId),
          eq(solicitudesDocumentos.alumnoId, userId),
          eq(solicitudesDocumentos.tipo, "alumno_regular"),
        ),
      )
      .limit(1);
    if (sol) {
      proposito = sol.observacion ?? null;
      fechaSolicitud = sol.createdAt ?? null;
    }
  }

  const cursosActivos = await db
    .select({
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(matriculas.alumnoId, userId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
        eq(asignaturas.estado, "activo"),
      ),
    );

  const rutDisplay = alumno?.rut
    ? alumno.rut.startsWith("EXT-")
      ? `Ext: ${alumno.rut.replace(/^EXT-/, "")}`
      : formatearRut(alumno.rut)
    : "—";

  const fechaEmision = (fechaSolicitud ?? new Date()).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cert-print, #cert-print * { visibility: visible; }
          #cert-print { position: fixed; inset: 0; padding: 40px 60px; }
        }
      `}</style>

      {/* Barra superior */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white">
          Certificado de Alumno Regular
        </h1>
        <PrintButton />
      </div>

      {/* Certificado */}
      <div
        id="cert-print"
        className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-12"
      >
        {/* Encabezado */}
        <div className="border-b border-gray-200 pb-6 text-center dark:border-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-intranet.webp"
            alt="OTEC"
            className="mx-auto mb-3 h-16 w-16 rounded-xl object-contain"
          />
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted dark:text-gray-500">
            Impulsate &amp; Emprende — OTEC
          </p>
          <h2 className="mt-2 text-2xl font-bold uppercase tracking-wide text-text-primary dark:text-white">
            Certificado de Alumno Regular
          </h2>
        </div>

        {/* Cuerpo */}
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-text-primary dark:text-gray-200">
          <p>
            Por medio del presente documento, <strong>Impulsate &amp; Emprende OTEC</strong> certifica que:
          </p>

          <div className="my-6 rounded-xl border border-primary/20 bg-primary/5 px-6 py-4 dark:border-primary/30 dark:bg-primary/10">
            <p className="text-lg font-bold text-text-primary dark:text-white">
              {alumno?.nombre} {alumno?.apellido}
            </p>
            <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
              RUT: <span className="font-mono font-semibold">{rutDisplay}</span>
            </p>
          </div>

          <p>
            Se encuentra actualmente en condición de <strong>Alumno Regular</strong>,
            con matrícula vigente en {cursosActivos.length > 0
              ? "los siguientes cursos de capacitación:"
              : "nuestra institución."}
          </p>

          {cursosActivos.length > 0 && (
            <ul className="ml-4 list-disc space-y-1">
              {cursosActivos.map((c) => (
                <li key={c.nombre}>
                  <strong>{c.nombre}</strong>
                  {c.codigo ? ` (${c.codigo})` : ""}
                </li>
              ))}
            </ul>
          )}

          {proposito && (
            <p className="mt-2">
              El presente certificado se emite para el siguiente fin:{" "}
              <strong>{proposito}</strong>.
            </p>
          )}

          <p className="mt-6">
            {proposito
              ? `Se extiende el presente certificado, a los ${fechaEmision}.`
              : `El presente certificado se emite para los fines que el interesado estime conveniente, a los ${fechaEmision}.`}
          </p>
        </div>

        {/* Firma */}
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <div className="h-px w-48 bg-gray-400 dark:bg-gray-600" />
          <p className="text-sm font-semibold text-text-primary dark:text-white">
            Impulsate &amp; Emprende OTEC
          </p>
          <p className="text-xs text-text-muted dark:text-gray-500">Firma y Timbre Institucional</p>
        </div>

        {/* Pie */}
        <p className="mt-8 text-center text-[10px] text-text-muted dark:text-gray-600">
          Documento generado electrónicamente el {fechaEmision} · Válido sin firma manuscrita
          {params.solicitudId ? ` · Ref: ${params.solicitudId.slice(0, 8).toUpperCase()}` : ""}
        </p>
      </div>
    </>
  );
}
