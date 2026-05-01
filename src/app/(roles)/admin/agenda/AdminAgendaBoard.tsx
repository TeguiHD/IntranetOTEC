"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  UserCog,
  Users,
} from "lucide-react";

import { CalendarioMensual } from "@/components/shared/CalendarioMensual";

type AgendaEvent = {
  id: string;
  tipo: "clase" | "evaluacion";
  titulo: string;
  asignaturaNombre: string;
  fecha: string;
  hora?: string | null;
  color: string;
};

type AgendaClase = {
  id: string;
  asignaturaId: string;
  asignaturaNombre: string;
  titulo: string;
  numeroSesion: number | null;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  publicada: boolean;
  docenteNombre: string | null;
  docenteApellido: string | null;
  alumnosMatriculados: number;
  asistenciaPorcentaje: number | null;
  evaluacionesDelDia: number;
};

type AdminAgendaBoardProps = {
  eventos: AgendaEvent[];
  clases: AgendaClase[];
  mesInicial: number;
  anioInicial: number;
  fechaInicial: string;
};

function asistSemaforoClass(pct: number): string {
  if (pct >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function asistSemaforoBg(pct: number): string {
  if (pct >= 75) return "bg-emerald-100 dark:bg-emerald-950/50";
  if (pct >= 50) return "bg-amber-100 dark:bg-amber-950/50";
  return "bg-red-100 dark:bg-red-950/50";
}

const formatDate = (isoDate: string): string => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
};

export function AdminAgendaBoard({
  eventos,
  clases,
  mesInicial,
  anioInicial,
  fechaInicial,
}: AdminAgendaBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(fechaInicial);

  useEffect(() => {
    setSelectedDate(fechaInicial);
  }, [anioInicial, fechaInicial, mesInicial]);

  const currentMonthKey = `${anioInicial}-${String(mesInicial).padStart(2, "0")}`;

  const clasesDelDia = useMemo(
    () =>
      clases
        .filter((clase) => clase.fecha === selectedDate)
        .sort((a, b) => {
          const left = a.horaInicio ?? "99:99";
          const right = b.horaInicio ?? "99:99";
          return left.localeCompare(right);
        }),
    [clases, selectedDate],
  );

  const eventosDelDia = useMemo(
    () => eventos.filter((event) => event.fecha === selectedDate),
    [eventos, selectedDate],
  );

  const asistenciaPromedio = useMemo(() => {
    const values = clasesDelDia
      .map((clase) => clase.asistenciaPorcentaje)
      .filter((value): value is number => value !== null);

    if (values.length === 0) {
      return null;
    }

    const total = values.reduce((acc, value) => acc + value, 0);
    return Math.round(total / values.length);
  }, [clasesDelDia]);

  const handleMonthChange = (mes: number, anio: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", String(mes));
    params.set("anio", String(anio));
    params.delete("fecha");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
      <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <CalendarioMensual
          eventosPorMes={{ [currentMonthKey]: eventos }}
          mesInicial={mesInicial}
          anioInicial={anioInicial}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onMesChange={handleMonthChange}
        />
      </article>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <header className="border-b border-gray-100 pb-3 dark:border-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Agenda diaria
          </p>
          <h2 className="mt-1 text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            {formatDate(selectedDate)}
          </h2>
        </header>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-center dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-lg font-bold text-primary">{clasesDelDia.length}</p>
            <p className="text-[11px] text-text-secondary dark:text-gray-400">Clases</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-center dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-lg font-bold text-secondary">{eventosDelDia.filter((event) => event.tipo === "evaluacion").length}</p>
            <p className="text-[11px] text-text-secondary dark:text-gray-400">Evaluaciones</p>
          </div>
          <div className={`rounded-xl border border-gray-100 p-3 text-center dark:border-gray-800 ${asistenciaPromedio !== null ? asistSemaforoBg(asistenciaPromedio) : "bg-gray-50/70 dark:bg-gray-800/50"}`}>
            <p className={`text-lg font-bold ${asistenciaPromedio !== null ? asistSemaforoClass(asistenciaPromedio) : "text-text-muted dark:text-gray-500"}`}>
              {asistenciaPromedio !== null ? `${asistenciaPromedio}%` : "-"}
            </p>
            <p className="text-[11px] text-text-secondary dark:text-gray-400">Asistencia promedio</p>
          </div>
        </div>

        {clasesDelDia.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center dark:border-gray-700">
            <CalendarDays className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
              No hay clases programadas para este dia.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {clasesDelDia.map((clase) => {
              const docente = `${clase.docenteNombre ?? "Sin"} ${clase.docenteApellido ?? "docente"}`.trim();

              return (
                <div
                  key={clase.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-text-primary dark:text-white">
                        {clase.titulo}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {clase.asignaturaNombre}
                        {clase.numeroSesion ? ` · Sesion ${clase.numeroSesion}` : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        clase.publicada
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {clase.publicada ? "Publicada" : "Borrador"}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-2 text-xs text-text-secondary dark:text-gray-400 sm:grid-cols-2">
                    <p className="inline-flex items-center gap-1.5">
                      <UserCog className="h-3.5 w-3.5" />
                      {docente}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {clase.alumnosMatriculados} alumnos
                    </p>
                    <p className={`inline-flex items-center gap-1.5 font-semibold ${clase.asistenciaPorcentaje !== null ? asistSemaforoClass(clase.asistenciaPorcentaje) : ""}`}>
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      {clase.asistenciaPorcentaje !== null
                        ? `${clase.asistenciaPorcentaje}% asistencia`
                        : "Sin asistencia registrada"}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      {clase.evaluacionesDelDia > 0
                        ? `${clase.evaluacionesDelDia} evaluaciones hoy`
                        : "Sin evaluaciones hoy"}
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-text-primary dark:text-gray-200">
                      Horario: {clase.horaInicio ?? "--:--"}
                      {clase.horaFin ? ` - ${clase.horaFin}` : ""}
                    </p>
                    <Link
                      href={`/admin/clases?asignaturaId=${clase.asignaturaId}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-light"
                    >
                      Abrir clase
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
}
