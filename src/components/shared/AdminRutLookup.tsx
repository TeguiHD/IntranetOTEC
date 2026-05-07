"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import Link from "next/link";
import { ClipboardList, IdCard, Loader2, Search, UserRound, X } from "lucide-react";

import { buscarPersonaPorRutAdmin, type BuscarPersonaPorRutAdminResult } from "@/actions/usuarios";
import { formatearIdentificador } from "@/lib/rut";

const formatDate = (value: Date | string | null): string => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const roleLabel = (role: "alumno" | "docente"): string =>
  role === "alumno" ? "Alumno" : "Docente";

export function AdminRutLookup() {
  const [open, setOpen] = useState(false);
  const [rut, setRut] = useState("");
  const [result, setResult] = useState<BuscarPersonaPorRutAdminResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const handler = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = rut.trim();
    if (!query || isPending) return;

    startTransition(async () => {
      const data = await buscarPersonaPorRutAdmin({ rut: query });
      setResult(data);
    });
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label="Buscar persona por RUT"
        title="Buscar por RUT"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-text-primary transition-colors hover:bg-primary/10 active:scale-95 dark:text-gray-100 dark:hover:bg-primary/20"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Cerrar búsqueda por RUT"
        />
      )}

      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[82dvh] flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 md:absolute md:bottom-auto md:left-auto md:right-0 md:top-[calc(100%+8px)] md:w-[25rem] md:rounded-2xl md:border">
          <div className="flex justify-center pt-2.5 md:hidden">
            <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <IdCard className="h-4 w-4 text-primary dark:text-primary-light" />
              <span className="text-sm font-semibold text-text-primary dark:text-white">
                Búsqueda RUT global
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar búsqueda por RUT"
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                value={rut}
                inputMode="text"
                onChange={(event) => setRut(event.target.value)}
                placeholder="12.345.678-9 o EXT-A123"
                className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary transition-[border-color,box-shadow] placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <button
                type="submit"
                disabled={!rut.trim() || isPending}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
              </button>
            </form>

            {result && !result.ok && (
              <div className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger dark:border-danger/30 dark:bg-danger/10">
                {result.message}
              </div>
            )}

            {result?.ok && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 dark:border-primary/30 dark:bg-primary/10">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm dark:bg-gray-900 dark:text-primary-light">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                        {result.persona.nombre} {result.persona.apellido}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                        {formatearIdentificador(result.persona.rut)} · {roleLabel(result.persona.rol)}
                      </p>
                    </div>
                  </div>
                </div>

                {result.role === "alumno" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-center dark:border-gray-800 dark:bg-gray-800/60">
                        <p className="text-xl font-bold text-primary">{result.metrics.asignaturasHistoricas}</p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">Históricas</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-center dark:border-gray-800 dark:bg-gray-800/60">
                        <p className="text-xl font-bold text-success">{result.metrics.asignaturasActivas}</p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">Activas</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {result.historial.slice(0, 4).map((row) => (
                        <div
                          key={row.matriculaId}
                          className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-xs dark:border-gray-800 dark:bg-gray-900"
                        >
                          <p className="truncate font-medium text-text-primary dark:text-white">{row.asignaturaNombre}</p>
                          <p className="mt-1 text-text-secondary dark:text-gray-400">
                            Pago: {row.estadoPago ?? "-"} · {row.activa ? "Activa" : "Inactiva"} · {formatDate(row.fechaMatricula)}
                          </p>
                        </div>
                      ))}
                      {result.historial.length === 0 && (
                        <p className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-3 text-sm text-text-secondary dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400">
                          Sin matrículas registradas.
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/admin/alumnos?q=${encodeURIComponent(rut.trim())}`}
                      onClick={() => setOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 dark:border-primary/40 dark:text-primary-light"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Ver en Alumnos
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-center dark:border-gray-800 dark:bg-gray-800/60">
                        <p className="text-xl font-bold text-primary">{result.metrics.cursosHistoricos}</p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">Cursos</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-center dark:border-gray-800 dark:bg-gray-800/60">
                        <p className="text-xl font-bold text-secondary">{result.metrics.materialCargado}</p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">Materiales</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {result.asignaturas.slice(0, 4).map((row) => (
                        <div
                          key={row.asignaturaId}
                          className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-xs dark:border-gray-800 dark:bg-gray-900"
                        >
                          <p className="truncate font-medium text-text-primary dark:text-white">{row.asignaturaNombre}</p>
                          <p className="mt-1 text-text-secondary dark:text-gray-400">
                            {row.estadoAsignatura ?? "-"} · {row.totalEstudiantes} estudiantes
                          </p>
                        </div>
                      ))}
                      {result.asignaturas.length === 0 && (
                        <p className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-3 text-sm text-text-secondary dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400">
                          Sin secciones asignadas.
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/admin/docentes?q=${encodeURIComponent(rut.trim())}`}
                      onClick={() => setOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 dark:border-primary/40 dark:text-primary-light"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Ver en Docentes
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
