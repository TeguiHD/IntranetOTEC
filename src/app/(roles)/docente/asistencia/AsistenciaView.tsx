"use client";

import { useCallback, useEffect, useOptimistic, useState, useTransition } from "react";

import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Medal,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";

import {
  listarClasesMesDocente,
  listarFidelidadDocente,
  registrarAsistenciaDocenteAction,
  type AlumnoFidelidad,
  type ClaseMes,
} from "@/actions/docente";

// ─── Types ───────────────────────────────────────────────────────────────────

type EstadoAsist = "presente" | "ausente" | "tardanza" | "justificado" | null;

type Asignatura = {
  id: string;
  nombre: string;
  codigo: string | null;
  estado: string | null;
};

type Props = {
  clasesMesInicial: ClaseMes[];
  asignaturas: Asignatura[];
  mesInicial: number;
  anioInicial: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const ESTADO_CONFIG: Record<
  NonNullable<EstadoAsist>,
  { label: string; dot: string; btn: string; activBtn: string }
> = {
  presente:    { label: "Presente",    dot: "bg-emerald-500",  btn: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950",  activBtn: "bg-emerald-500 text-white border-emerald-500" },
  tardanza:    { label: "Tardanza",    dot: "bg-amber-400",    btn: "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950",              activBtn: "bg-amber-400 text-white border-amber-400" },
  ausente:     { label: "Ausente",     dot: "bg-rose-500",     btn: "border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950",                    activBtn: "bg-rose-500 text-white border-rose-500" },
  justificado: { label: "Justificado", dot: "bg-blue-500",     btn: "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950",                    activBtn: "bg-blue-500 text-white border-blue-500" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFechaCorta(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(d);
}

// ─── Asistencia Calendar ─────────────────────────────────────────────────────

function CalendarTab({
  clasesMes,
  mes,
  anio,
  onMesChange,
}: {
  clasesMes: ClaseMes[];
  mes: number;
  anio: number;
  onMesChange: (m: number, a: number) => void;
}) {
  const todayIso = (() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  })();
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    clasesMes.some((clase) => clase.fecha === todayIso) ? todayIso : null,
  );
  const [localClases, setLocalClases] = useOptimistic(clasesMes);
  const [isPending, startTransition] = useTransition();

  // Build calendar grid
  const primerDia = new Date(anio, mes - 1, 1);
  let primerDow = primerDia.getDay() - 1;
  if (primerDow < 0) primerDow = 6;
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array<null>(primerDow).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];
  while (celdas.length % 7 !== 0) celdas.push(null);

  const hoy = new Date();
  const isHoy = (d: number) =>
    d === hoy.getDate() && mes === hoy.getMonth() + 1 && anio === hoy.getFullYear();

  const clasesPorDia = (d: number): ClaseMes[] => {
    const fechaStr = `${anio}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return clasesMes.filter((c) => c.fecha === fechaStr);
  };

  const selectedClases = selectedDate
    ? clasesMes.filter((c) => c.fecha === selectedDate)
    : [];

  const handleMarcar = useCallback(
    (claseId: string, matriculaId: string, estado: NonNullable<EstadoAsist>, fecha: string) => {
      startTransition(async () => {
        setLocalClases((prev) =>
          prev.map((clase) =>
            clase.id !== claseId
              ? clase
              : {
                  ...clase,
                  alumnos: clase.alumnos.map((a) =>
                    a.matriculaId !== matriculaId ? a : { ...a, estado },
                  ),
                },
          ),
        );
        await registrarAsistenciaDocenteAction({
          claseId,
          matriculaId,
          estado,
          fechaRegistro: fecha,
        });
      });
    },
    [setLocalClases],
  );

  const irMes = (delta: number) => {
    const newMes = mes + delta;
    if (newMes < 1) onMesChange(12, anio - 1);
    else if (newMes > 12) onMesChange(1, anio + 1);
    else onMesChange(newMes, anio);
    setSelectedDate(null);
  };

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <button
            onClick={() => irMes(-1)}
            disabled={isPending}
            className="rounded-lg p-1.5 text-text-secondary transition hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-bold text-text-primary dark:text-white">
            {MESES[mes - 1]} {anio}
          </h2>
          <button
            onClick={() => irMes(1)}
            disabled={isPending}
            className="rounded-lg p-1.5 text-text-secondary transition hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
          {DIAS_CORTOS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-text-secondary dark:text-gray-500">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 p-2 gap-1">
          {celdas.map((dia, i) => {
            if (!dia) return <div key={`empty-${i}`} />;
            const fechaStr = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            const clasesDia = clasesPorDia(dia);
            const isSelected = selectedDate === fechaStr;
            const hayClases = clasesDia.length > 0;
            // Count estados for dots
            const hayPendientes = clasesDia.some((c) => c.alumnos.some((a) => a.estado === null));

            return (
              <button
                key={dia}
                onClick={() => setSelectedDate(isSelected ? null : fechaStr)}
                className={[
                  "relative flex flex-col items-center rounded-xl py-2 text-sm font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform]",
                  isHoy(dia)
                    ? "ring-2 ring-primary ring-offset-1"
                    : "",
                  isSelected
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : hayClases
                    ? "bg-primary/8 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:text-primary-light dark:hover:bg-primary/25"
                    : "text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
                ].join(" ")}
              >
                <span>{dia}</span>
                {hayClases && (
                  <div className="mt-1 flex gap-0.5">
                    {clasesDia.slice(0, 3).map((c) => {
                      const totalAlumnos = c.alumnos.length;
                      const marcados = c.alumnos.filter((a) => a.estado !== null).length;
                      const completo = totalAlumnos > 0 && marcados === totalAlumnos;
                      return (
                        <span
                          key={c.id}
                          className={[
                            "h-1.5 w-1.5 rounded-full",
                            isSelected
                              ? "bg-white/80"
                              : completo
                              ? "bg-emerald-500"
                              : hayPendientes
                              ? "bg-amber-400"
                              : "bg-primary",
                          ].join(" ")}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-xs text-text-secondary dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Asistencia completa</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Pendiente</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Clase</span>
      </div>

      {/* Day panel */}
      {selectedDate && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-text-primary dark:text-white">
              {formatFechaCorta(selectedDate)}
            </h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary dark:bg-primary/20">
              {selectedClases.length} clase{selectedClases.length !== 1 ? "s" : ""}
            </span>
          </div>

          {selectedClases.length === 0 ? (
            <p className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-text-secondary dark:border-gray-800 dark:bg-gray-900">
              Sin clases este día.
            </p>
          ) : (
            selectedClases.map((clase) => (
              <ClasePanel
                key={clase.id}
                clase={clase}
                localClases={localClases}
                onMarcar={handleMarcar}
              />
            ))
          )}
        </div>
      )}

      {selectedDate === null && clasesMes.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-text-secondary dark:border-gray-700 dark:bg-gray-900">
          No hay clases programadas en {MESES[mes - 1]}.
        </p>
      )}
    </div>
  );
}

// ─── Clase Panel ─────────────────────────────────────────────────────────────

function ClasePanel({
  clase,
  localClases,
  onMarcar,
}: {
  clase: ClaseMes;
  localClases: ClaseMes[];
  onMarcar: (claseId: string, matriculaId: string, estado: NonNullable<EstadoAsist>, fecha: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const localClase = localClases.find((c) => c.id === clase.id) ?? clase;
  const marcados = localClase.alumnos.filter((a) => a.estado !== null).length;
  const total = localClase.alumnos.length;
  const completo = total > 0 && marcados === total;
  const pct = total > 0 ? Math.round((marcados / total) * 100) : 0;
  const marcarTodos = (estado: NonNullable<EstadoAsist>) => {
    localClase.alumnos.forEach((alumno) => {
      if (alumno.estado !== estado) {
        onMarcar(clase.id, alumno.matriculaId, estado, clase.fecha);
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-text-primary dark:text-white">
            {clase.titulo}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-secondary dark:text-gray-400">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {clase.asignaturaNombre}
            </span>
            {clase.horaInicio && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {String(clase.horaInicio).slice(0, 5)}
                {clase.horaFin ? `–${String(clase.horaFin).slice(0, 5)}` : ""}
              </span>
            )}
            {clase.sala && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {clase.sala}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {completo ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completo
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              {marcados}/{total}
            </span>
          )}
          <ChevronRight
            className={`h-4 w-4 text-text-secondary transition-transform dark:text-gray-500 ${expanded ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-1 transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-500 ${completo ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {expanded && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {total === 0 ? (
            <p className="px-4 py-4 text-sm text-text-secondary dark:text-gray-400">
              Sin alumnos matriculados.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-3 bg-gray-50/70 px-4 py-3 dark:bg-gray-800/40 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    Nomina del curso
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-500">
                    Marca con el punto verde si asiste o rojo si no asiste.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => marcarTodos("presente")}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Todos presentes
                  </button>
                  <button
                    type="button"
                    onClick={() => marcarTodos("ausente")}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    Todos ausentes
                  </button>
                </div>
              </div>

              {localClase.alumnos.map((alumno) => {
                const nombreCompleto = `${alumno.alumnoApellido}, ${alumno.alumnoNombre}`;

                return (
                  <div
                    key={alumno.matriculaId}
                    className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary dark:text-white">
                        {nombreCompleto}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-500">
                        RUT / credencial: {alumno.alumnoRut ?? "-"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => onMarcar(clase.id, alumno.matriculaId, "presente", clase.fecha)}
                        title={`Marcar presente a ${nombreCompleto}`}
                        aria-label={`Marcar presente a ${nombreCompleto}`}
                        className={[
                          "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all active:scale-95",
                          alumno.estado === "presente"
                            ? ESTADO_CONFIG.presente.activBtn
                            : "border-emerald-300 bg-white text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40",
                        ].join(" ")}
                      >
                        <span className="h-4 w-4 rounded-full bg-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMarcar(clase.id, alumno.matriculaId, "ausente", clase.fecha)}
                        title={`Marcar ausente a ${nombreCompleto}`}
                        aria-label={`Marcar ausente a ${nombreCompleto}`}
                        className={[
                          "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all active:scale-95",
                          alumno.estado === "ausente"
                            ? ESTADO_CONFIG.ausente.activBtn
                            : "border-rose-300 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-rose-950/40",
                        ].join(" ")}
                      >
                        <span className="h-4 w-4 rounded-full bg-current" />
                      </button>
                      {(["tardanza", "justificado"] as const).map((est) => {
                        const cfg = ESTADO_CONFIG[est];
                        const active = alumno.estado === est;
                        return (
                          <button
                            key={est}
                            type="button"
                            onClick={() => onMarcar(clase.id, alumno.matriculaId, est, clase.fecha)}
                            className={[
                              "h-9 rounded-lg border px-2.5 text-xs font-semibold transition-all active:scale-95",
                              active ? cfg.activBtn : cfg.btn,
                            ].join(" ")}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loyalty Card Tab ─────────────────────────────────────────────────────────

function FidelidadTab({ asignaturas }: { asignaturas: Asignatura[] }) {
  const [selectedAsig, setSelectedAsig] = useState<string>(asignaturas[0]?.id ?? "");
  const [fidelidad, setFidelidad] = useState<AlumnoFidelidad[] | null>(null);
  const [loading, startLoad] = useTransition();

  const cargar = useCallback((asigId: string) => {
    setSelectedAsig(asigId);
    startLoad(async () => {
      const data = await listarFidelidadDocente(asigId);
      setFidelidad(data);
    });
  }, []);

  useEffect(() => {
    if (asignaturas[0]) cargar(asignaturas[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {asignaturas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <Users className="mx-auto mb-2 h-8 w-8 text-text-secondary dark:text-gray-500" />
          <p className="text-sm text-text-secondary dark:text-gray-400">
            No tienes asignaturas asignadas aún.
          </p>
        </div>
      )}

      {/* Asignatura selector */}
      {asignaturas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {asignaturas.map((a) => (
            <button
              key={a.id}
              onClick={() => cargar(a.id)}
              className={[
                "rounded-xl border px-3 py-1.5 text-sm font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform]",
                selectedAsig === a.id
                  ? "border-primary bg-primary text-white shadow-sm shadow-primary/30"
                  : "border-gray-200 bg-white text-text-secondary hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-primary/40",
              ].join(" ")}
            >
              {a.nombre}
            </button>
          ))}
        </div>
      )}

      {asignaturas.length === 1 && (
        <p className="text-sm font-semibold text-text-primary dark:text-white">{asignaturas[0].nombre}</p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && fidelidad !== null && fidelidad.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <Users className="mx-auto mb-2 h-8 w-8 text-text-secondary dark:text-gray-500" />
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Sin alumnos o clases en esta asignatura aún.
          </p>
        </div>
      )}

      {!loading &&
        fidelidad !== null &&
        fidelidad.map((alumno) => (
          <TarjetaFidelizacion key={alumno.matriculaId} alumno={alumno} />
        ))}
    </div>
  );
}

// ─── Tarjeta de Fidelización ─────────────────────────────────────────────────

function TarjetaFidelizacion({ alumno }: { alumno: AlumnoFidelidad }) {
  const pct = alumno.totalClases > 0 ? Math.round((alumno.presente / alumno.totalClases) * 100) : 0;
  const completo = pct === 100;
  const bueno = pct >= 75;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-[background-color,border-color,color,box-shadow,opacity,transform] dark:bg-gray-900",
        completo
          ? "border-amber-300 shadow-amber-100 dark:border-amber-700 dark:shadow-amber-900/20"
          : bueno
          ? "border-emerald-200 dark:border-emerald-800"
          : "border-gray-200 dark:border-gray-800",
      ].join(" ")}
    >
      {/* Background glow for 100% */}
      {completo && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-900/10" />
      )}

      {/* Header */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-text-primary dark:text-white">
            {alumno.alumnoApellido}, {alumno.alumnoNombre}
          </p>
          {alumno.alumnoRut && (
            <p className="text-xs text-text-secondary dark:text-gray-500">{alumno.alumnoRut}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {completo ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Trophy className="h-3.5 w-3.5" />
              100%
            </span>
          ) : bueno ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Medal className="h-3.5 w-3.5" />
              {pct}%
            </span>
          ) : (
            <span
              className={[
                "rounded-full px-2.5 py-1 text-xs font-bold",
                pct >= 50
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
              ].join(" ")}
            >
              {pct}%
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={[
            "h-2 rounded-full transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-700",
            completo
              ? "bg-gradient-to-r from-amber-400 to-amber-500"
              : bueno
              ? "bg-emerald-500"
              : pct >= 50
              ? "bg-amber-400"
              : "bg-rose-500",
          ].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stamp dots — loyalty card grid */}
      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {alumno.sesiones.map((sesion) => {
          const cfg = sesion.estado ? ESTADO_CONFIG[sesion.estado] : null;
          return (
            <div
              key={sesion.claseId}
              title={`Sesión ${sesion.numeroSesion}: ${sesion.titulo} — ${cfg?.label ?? "Sin marcar"}`}
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110",
                sesion.estado ? cfg!.dot : "bg-gray-200 dark:bg-gray-700",
                sesion.estado === "presente" || sesion.estado === "tardanza" ? "ring-2 ring-white dark:ring-gray-900" : "",
              ].join(" ")}
            >
              {sesion.estado === "presente" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : sesion.estado === "ausente" ? (
                <XCircle className="h-4 w-4" />
              ) : sesion.estado === "tardanza" ? (
                <Clock className="h-4 w-4" />
              ) : (
                <span className="text-gray-400 dark:text-gray-600">{sesion.numeroSesion}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="relative mt-2 flex items-center justify-between text-xs text-text-secondary dark:text-gray-500">
        <span>{alumno.presente} de {alumno.totalClases} clases</span>
        {completo && (
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            ¡Asistencia perfecta!
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function AsistenciaView({ clasesMesInicial, asignaturas, mesInicial, anioInicial }: Props) {
  const [tab, setTab] = useState<"calendario" | "tarjetas">("calendario");
  const [mes, setMes] = useState(mesInicial);
  const [anio, setAnio] = useState(anioInicial);
  const [clasesMes, setClasesMes] = useState<ClaseMes[]>(clasesMesInicial);
  const [loadingMes, startLoadMes] = useTransition();

  const handleMesChange = useCallback((nuevoMes: number, nuevoAnio: number) => {
    setMes(nuevoMes);
    setAnio(nuevoAnio);
    startLoadMes(async () => {
      const data = await listarClasesMesDocente(nuevoAnio, nuevoMes);
      setClasesMes(data);
    });
  }, []);

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Asistencia</h1>
        <p className="mt-1 text-sm text-white/80">
          Marca asistencia por clase y visualiza el avance de tus alumnos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900">
        {(["calendario"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 rounded-lg py-2 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,opacity,transform]",
              tab === t
                ? "bg-white text-primary shadow-sm dark:bg-gray-800 dark:text-primary-light"
                : "text-text-secondary hover:text-text-primary dark:text-gray-500 dark:hover:text-gray-300",
            ].join(" ")}
          >
            {t === "calendario" ? "Marcar Asistencia" : "Tarjetas de Asistencia"}
          </button>
        ))}
      </div>

      {tab === "calendario" && (
        <div className={loadingMes ? "opacity-60 pointer-events-none transition-opacity" : ""}>
          <CalendarTab
            clasesMes={clasesMes}
            mes={mes}
            anio={anio}
            onMesChange={handleMesChange}
          />
        </div>
      )}

      {tab === "tarjetas" && <FidelidadTab asignaturas={asignaturas} />}
    </section>
  );
}
