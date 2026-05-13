"use client";

import { CheckCircle2, Download, FileWarning, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  emitirCertificadoAlumnoRegular,
  obtenerCertificadoAlumnoParaPdf,
  type CertificadoDisponible,
  type CertificadoHistorialItem,
} from "@/actions/certificados";

const FINALIDADES = [
  { value: "asignacion_familiar", label: "Asignación familiar" },
  { value: "servicio_militar", label: "Servicio militar" },
  { value: "fines_particulares", label: "Fines particulares" },
  { value: "otro", label: "Otro" },
] as const;

type FinalidadValue = (typeof FINALIDADES)[number]["value"];

type Props = {
  disponibles: CertificadoDisponible[];
  historial: CertificadoHistorialItem[];
};

const formatFecha = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
};

async function descargarPdfCertificado(certificadoId: string): Promise<void> {
  const data = await obtenerCertificadoAlumnoParaPdf(certificadoId);
  if (!data) {
    toast.error("No fue posible obtener los datos del certificado.");
    return;
  }

  const [{ pdf }, { CertificadoRegularDocument }, QRCode, { INSTITUCION_OTEC }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/CertificadoRegular"),
    import("qrcode"),
    import("@/lib/institucion"),
  ]);

  const verifyUrl = `${INSTITUCION_OTEC.intranetUrl}/verificar/${data.codigoUnico}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#1F1B2E", light: "#FFFFFF" },
  });

  const blob = await pdf(
    <CertificadoRegularDocument
      data={{
        codigoUnico: data.codigoUnico,
        alumnoNombre: data.alumnoNombre,
        alumnoApellido: data.alumnoApellido,
        alumnoRut: data.alumnoRut,
        cursoNombre: data.cursoNombre,
        finalidad: data.finalidad,
        fechaEmision: data.fechaEmision,
        qrDataUrl,
      }}
    />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `certificado-alumno-regular-${data.codigoUnico}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CertificadosAlumnoCliente({ disponibles, historial }: Props) {
  const router = useRouter();
  const [matriculaId, setMatriculaId] = useState<string>(disponibles[0]?.matriculaId ?? "");
  const [finalidad, setFinalidad] = useState<FinalidadValue>("fines_particulares");
  const [finalidadOtro, setFinalidadOtro] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  const sinCursos = disponibles.length === 0;

  const handleEmitir = () => {
    if (!matriculaId) {
      toast.error("Selecciona un curso para emitir el certificado.");
      return;
    }
    if (finalidad === "otro" && finalidadOtro.trim().length < 3) {
      toast.error("Describe brevemente la finalidad (mínimo 3 caracteres).");
      return;
    }

    startTransition(async () => {
      const result = await emitirCertificadoAlumnoRegular({
        matriculaId,
        finalidad,
        finalidadOtro: finalidad === "otro" ? finalidadOtro.trim() : undefined,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Certificado emitido correctamente.");

      try {
        setDescargandoId(result.certificadoId);
        await descargarPdfCertificado(result.certificadoId);
      } catch (err) {
        toast.error("Certificado emitido, pero no se pudo descargar automáticamente.");
        console.error(err);
      } finally {
        setDescargandoId(null);
      }

      router.refresh();
    });
  };

  const handleDescargar = async (id: string) => {
    setDescargandoId(id);
    try {
      await descargarPdfCertificado(id);
    } catch (err) {
      toast.error("No se pudo generar el PDF.");
      console.error(err);
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-5">
      {/* ── Emitir certificado ── */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
        <header className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="text-base font-semibold text-text-primary dark:text-white">
            Certificado de Alumno Regular
          </h2>
        </header>

        {sinCursos ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            <FileWarning className="mt-0.5 h-5 w-5 shrink-0" />
            <p>No tienes cursos activos disponibles para emitir certificado de alumno regular.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Curso selector */}
            <div>
              <label
                htmlFor="cert-curso"
                className="mb-1.5 block text-sm font-medium text-text-primary dark:text-gray-200"
              >
                Curso / asignatura
              </label>
              <select
                id="cert-curso"
                value={matriculaId}
                onChange={(e) => setMatriculaId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                {disponibles.map((d) => (
                  <option key={d.matriculaId} value={d.matriculaId}>
                    {d.cursoNombre} – {d.asignaturaNombre}
                    {d.asignaturaCodigo ? ` (${d.asignaturaCodigo})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Finalidad selector */}
            <div>
              <label
                htmlFor="cert-finalidad"
                className="mb-1.5 block text-sm font-medium text-text-primary dark:text-gray-200"
              >
                Finalidad del certificado
              </label>
              <select
                id="cert-finalidad"
                value={finalidad}
                onChange={(e) => setFinalidad(e.target.value as FinalidadValue)}
                disabled={isPending}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                {FINALIDADES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Otro finalidad */}
            {finalidad === "otro" && (
              <div>
                <label
                  htmlFor="cert-finalidad-otro"
                  className="mb-1.5 block text-sm font-medium text-text-primary dark:text-gray-200"
                >
                  Describe la finalidad
                </label>
                <input
                  id="cert-finalidad-otro"
                  type="text"
                  maxLength={120}
                  value={finalidadOtro}
                  onChange={(e) => setFinalidadOtro(e.target.value)}
                  disabled={isPending}
                  placeholder="Ej: postulación a beca, trámite migratorio…"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>
            )}

            {/* Botón generar — full width en mobile */}
            <button
              type="button"
              onClick={handleEmitir}
              disabled={isPending || !matriculaId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {isPending ? "Generando…" : "Generar certificado"}
            </button>

            <p className="text-xs text-text-muted dark:text-gray-500">
              El certificado incluye firma digital institucional y código QR de verificación.
            </p>
          </div>
        )}
      </article>

      {/* ── Historial ── */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
        <header className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="text-base font-semibold text-text-primary dark:text-white">
            Historial de certificados
          </h2>
        </header>

        {historial.length === 0 ? (
          <p className="text-sm text-text-muted dark:text-gray-400">
            Aún no has emitido certificados.
          </p>
        ) : (
          <ul className="space-y-3">
            {historial.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800"
              >
                {/* Fila superior: nombre + badge */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 flex-1 truncate font-semibold text-text-primary dark:text-white">
                    {c.cursoNombre ?? "Curso"}
                    {c.asignaturaNombre ? ` – ${c.asignaturaNombre}` : ""}
                  </span>
                  {c.valido ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Válido
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                      <XCircle className="h-3 w-3" /> Anulado
                    </span>
                  )}
                </div>

                {/* Fila meta: fecha · código · finalidad */}
                <p className="mt-1 truncate text-xs text-text-muted dark:text-gray-400">
                  {formatFecha(c.fechaEmision)} · {c.codigoUnico}
                  {c.finalidad ? ` · ${c.finalidad}` : ""}
                </p>

                {/* Botón descargar — full width en mobile */}
                {c.tipo === "alumno_regular" && c.valido ? (
                  <button
                    type="button"
                    onClick={() => handleDescargar(c.id)}
                    disabled={descargandoId === c.id}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:py-1.5 dark:border-primary/40 dark:bg-primary/10 dark:text-primary-light"
                  >
                    {descargandoId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Descargar PDF
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
