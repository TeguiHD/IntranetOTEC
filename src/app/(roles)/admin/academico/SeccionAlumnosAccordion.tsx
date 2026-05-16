"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Users } from "lucide-react";

import { obtenerAlumnosDeSeccion, type AlumnoDeSeccionRow } from "@/actions/matriculas";

type Props = {
  asignaturaId: string;
};

const PAGO_TONE: Record<string, string> = {
  pagado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  mora: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
};

export function SeccionAlumnosAccordion({ asignaturaId }: Props) {
  const [open, setOpen] = useState(false);
  const [alumnos, setAlumnos] = useState<AlumnoDeSeccionRow[] | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && alumnos === null) {
      start(async () => {
        try {
          const data = await obtenerAlumnosDeSeccion(asignaturaId);
          setAlumnos(data);
        } catch {
          setError("No se pudieron cargar los alumnos.");
        }
      });
    }
  };

  return (
    <div className="mt-2 w-full">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-text-secondary transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <span className="inline-flex items-center gap-1.5">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Users className="h-3.5 w-3.5" />
          {alumnos === null
            ? "Ver alumnos matriculados"
            : `Alumnos matriculados (${alumnos.length})`}
        </span>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50/60 p-2 dark:border-gray-800 dark:bg-gray-800/40">
          {pending ? (
            <p className="px-2 py-3 text-center text-xs text-text-secondary dark:text-gray-400">
              Cargando alumnos…
            </p>
          ) : error ? (
            <p className="px-2 py-3 text-center text-xs text-red-600 dark:text-red-300">{error}</p>
          ) : alumnos && alumnos.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-text-secondary dark:text-gray-400">
              Sin matrículas activas.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {alumnos?.map((a) => {
                const pagoTone = PAGO_TONE[a.estadoPago ?? "pendiente"] ?? PAGO_TONE.pendiente;
                return (
                  <li
                    key={a.matriculaId}
                    className="flex items-center justify-between gap-2 px-2 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-text-primary dark:text-gray-100">
                        {a.nombre} {a.apellido}
                      </p>
                      <p className="truncate text-[10px] text-text-secondary dark:text-gray-400">
                        {a.rut}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase ${pagoTone}`}
                      >
                        {a.estadoPago ?? "—"}
                      </span>
                      <Link
                        href={`/admin/alumnos/${a.alumnoId}`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-secondary transition hover:bg-white hover:text-primary dark:text-gray-400 dark:hover:bg-gray-700"
                        aria-label="Ver ficha del alumno"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
            <Link
              href={`/admin/matriculas?asignaturaId=${asignaturaId}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/5 dark:bg-gray-900 dark:text-primary-light"
            >
              Gestionar matrículas
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
