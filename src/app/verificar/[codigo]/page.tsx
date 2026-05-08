import { CheckCircle2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { eq } from "drizzle-orm";
import Link from "next/link";

import { getDb } from "@/db";
import { certificados } from "@/db/schema";
import {
  coerceCertificadoSnapshot,
  isCodigoCertificadoValido,
  sanitizeCertificadoText,
} from "@/lib/certificados";
import { INSTITUCION_OTEC } from "@/lib/institucion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verificar Certificado · OTEC" };

type Props = { params: Promise<{ codigo: string }> };

const formatFecha = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
};

const tipoLabel = (tipo: string): string => {
  if (tipo === "alumno_regular") return "Certificado de Alumno Regular";
  if (tipo === "termino_curso") return "Certificado de Término de Curso";
  return "Certificado";
};

export default async function VerificarCertificadoPage({ params }: Props) {
  const { codigo: codigoParam } = await params;
  const codigo = sanitizeCertificadoText(codigoParam, 64);

  const codigoValido = codigo ? isCodigoCertificadoValido(codigo) : false;

  let estado: "valido" | "invalido" | "no_encontrado" = "no_encontrado";
  let snapshot: ReturnType<typeof coerceCertificadoSnapshot> | null = null;
  let tipo: string | null = null;
  let fechaEmision: string | null = null;
  let codigoUnico: string | null = null;

  if (codigoValido && codigo) {
    const db = getDb();
    const [row] = await db
      .select({
        codigoUnico: certificados.codigoUnico,
        tipo: certificados.tipo,
        valido: certificados.valido,
        fechaEmision: certificados.fechaEmision,
        datosSnapshot: certificados.datosSnapshot,
      })
      .from(certificados)
      .where(eq(certificados.codigoUnico, codigo))
      .limit(1);

    if (row) {
      snapshot = coerceCertificadoSnapshot(row.datosSnapshot);
      tipo = row.tipo;
      codigoUnico = row.codigoUnico;
      fechaEmision = row.fechaEmision ? new Date(row.fechaEmision).toISOString() : null;
      estado = row.valido ? "valido" : "invalido";
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-br from-purple-50 via-white to-amber-50 px-4 py-10 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {INSTITUCION_OTEC.nombreCorto}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary dark:text-white">
            Verificación de Certificado
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Validación pública mediante código único.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {estado === "no_encontrado" ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="rounded-full bg-rose-100 p-3 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
                <ShieldX className="h-7 w-7" />
              </span>
              <h2 className="text-lg font-semibold text-text-primary dark:text-white">
                Certificado no encontrado
              </h2>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                El código <span className="font-mono">{codigoParam}</span> no corresponde a un
                certificado emitido por {INSTITUCION_OTEC.nombreCorto}.
              </p>
            </div>
          ) : estado === "invalido" ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                <ShieldAlert className="h-7 w-7" />
              </span>
              <h2 className="text-lg font-semibold text-text-primary dark:text-white">
                Certificado inválido
              </h2>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Este certificado fue anulado por la institución y no debe ser considerado válido.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-emerald-100 p-2.5 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                    Certificado válido
                  </h2>
                  <p className="text-xs text-text-muted dark:text-gray-500">
                    Emitido por {INSTITUCION_OTEC.nombreCorto}.
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                <Campo label="Tipo" value={tipoLabel(tipo ?? "")} />
                <Campo label="Código único" value={codigoUnico ?? "—"} mono />
                <Campo
                  label="Alumno"
                  value={`${snapshot?.alumnoNombre ?? ""} ${snapshot?.alumnoApellido ?? ""}`.trim() || "—"}
                />
                <Campo label="RUT/Credencial" value={formatRutDisplay(snapshot?.alumnoRut)} mono />
                <Campo label="Curso / programa" value={snapshot?.nombreCurso ?? "—"} />
                <Campo label="Finalidad" value={snapshot?.finalidad ?? "—"} />
                <Campo label="Fecha de emisión" value={formatFecha(fechaEmision)} />
                <Campo
                  label="Institución"
                  value={snapshot?.nombreEstablecimiento ?? INSTITUCION_OTEC.nombreCorto}
                />
              </dl>

              <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>
                  Los datos mostrados corresponden al snapshot inmutable registrado al momento de
                  emitir el certificado.
                </span>
              </div>
            </div>
          )}
        </section>

        <footer className="mt-6 text-center text-xs text-text-muted dark:text-gray-500">
          <p>
            {INSTITUCION_OTEC.nombre} · RUT {INSTITUCION_OTEC.rut}
          </p>
          <p>
            {INSTITUCION_OTEC.registroSence} · {INSTITUCION_OTEC.idOtec} ·{" "}
            {INSTITUCION_OTEC.registroInn}
          </p>
          <p className="mt-2">
            <Link href="/" className="text-primary hover:underline">
              Volver al inicio
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

function Campo({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 break-words text-text-primary dark:text-gray-100 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function formatRutDisplay(rut: string | null | undefined): string {
  if (!rut) return "—";
  if (rut.startsWith("EXT-")) return `Ext: ${rut.replace(/^EXT-/, "")}`;
  return rut;
}
