"use client";

import { useState } from "react";

import { QrCode, X } from "lucide-react";

import { generarQrAsistenciaAction } from "@/actions/qr-asistencia";

type Props = { claseId: string; claseNombre: string };

export function QrAsistenciaButton({ claseId, claseNombre }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generar = async () => {
    setLoading(true);
    setError(null);
    const result = await generarQrAsistenciaAction(claseId);
    setLoading(false);
    if (result.ok && result.svgDataUrl) {
      setSvgDataUrl(result.svgDataUrl);
      setExpiresAt(result.expiresAt ? new Date(result.expiresAt) : null);
      setOpen(true);
    } else {
      setError(result.error ?? "Error al generar QR");
    }
  };

  const formatExpiry = (d: Date) =>
    d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <button
        type="button"
        onClick={generar}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 dark:bg-primary/20 dark:text-primary-light"
      >
        <QrCode className="h-3.5 w-3.5" />
        {loading ? "Generando…" : "QR Asistencia"}
      </button>

      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}

      {/* Modal */}
      {open && svgDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar QR de asistencia"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar QR de asistencia"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-text-primary dark:text-white">
                  QR de Asistencia
                </h2>
              </div>
              <p className="text-xs text-text-secondary dark:text-gray-400">{claseNombre}</p>
            </div>

            {/* QR code */}
            <div className="mx-auto mt-4 flex h-56 w-56 items-center justify-center rounded-xl border-2 border-primary/20 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={svgDataUrl} alt="QR asistencia" className="h-full w-full" />
            </div>

            {expiresAt && (
              <p className="mt-3 text-center text-xs text-text-secondary dark:text-gray-400">
                Válido hasta las{" "}
                <span className="font-semibold text-primary dark:text-primary-light">
                  {formatExpiry(expiresAt)}
                </span>
                {" "}· 30 minutos
              </p>
            )}

            <p className="mt-2 text-center text-[11px] text-text-muted dark:text-gray-500">
              Los alumnos escanean este QR con su celular para registrar asistencia.
            </p>

            <button
              type="button"
              onClick={generar}
              disabled={loading}
              className="mt-4 w-full rounded-xl border border-primary/30 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 dark:text-primary-light"
            >
              {loading ? "Generando…" : "Renovar QR"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
