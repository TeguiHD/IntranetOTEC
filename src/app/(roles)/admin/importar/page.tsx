"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

type PreviewStatus = "ok" | "warning" | "error";
type PeriodStatus = "planificado" | "activo" | "cerrado";
type PeriodFilter = "todos" | PeriodStatus;
type ReplaceScope = "sections" | "period";

type PeriodOption = {
  id: string;
  codigo: string;
  nombre: string;
  estado: PeriodStatus;
  fechaInicio: string;
  fechaFin: string;
};

type PreviewRow = {
  lineNumber: number;
  curso: string;
  cursoCanonico: string | null;
  nombreCompleto: string;
  rutRaw: string;
  identifier: string | null;
  telefono: string | null;
  status: PreviewStatus;
  messages: string[];
};

type PreviewResult = {
  fileName: string;
  period: PeriodOption;
  totalRows: number;
  readyRows: number;
  warningRows: number;
  errorRows: number;
  uniqueCourses: number;
  autoCredentialsEstimated: number;
  canImport: boolean;
  errors: string[];
  warnings: string[];
  rows: PreviewRow[];
  truncated: boolean;
};

type ImportResult = {
  period: PeriodOption;
  created: number;
  updated: number;
  coursesCreated: number;
  enrollmentsCreated: number;
  enrollmentsReactivated: number;
  enrollmentsClosed: number;
  studentsRetired: number;
  autoCredentialsCreated: number;
  replaceScope: ReplaceScope;
  errors: string[];
  warnings: string[];
  total: number;
};

type NewPeriodDraft = {
  codigo: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: PeriodStatus;
};

const STATUS_LABELS: Record<PeriodStatus, string> = {
  planificado: "Planificado",
  activo: "Activo",
  cerrado: "Cerrado",
};

const STATUS_BADGE_CLASS: Record<PeriodStatus, string> = {
  planificado: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  activo: "bg-success/15 text-success",
  cerrado: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
};

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const IMPORT_STEPS = [
  {
    title: "Periodo destino",
    text: "El periodo elegido determina dónde quedarán las secciones creadas o reutilizadas.",
  },
  {
    title: "Cursos del Excel",
    text: "Cada valor de Curso se consolida como sección operativa para matricular alumnos.",
  },
  {
    title: "Alumnos",
    text: "Se crean o actualizan por RUT/credencial, evitando duplicados por formato.",
  },
  {
    title: "Matrículas",
    text: "Los alumnos válidos quedan matriculados en la sección correspondiente.",
  },
];

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const buildDefaultNewPeriodDraft = (): NewPeriodDraft => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const last = lastDayOfMonth(year, month);
  return {
    codigo: `${year}-${String(month).padStart(2, "0")}`,
    nombre: `${MESES_ES[month - 1]} ${year}`,
    fechaInicio: `${year}-${String(month).padStart(2, "0")}-01`,
    fechaFin: `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    estado: "activo",
  };
};

const formatDisplayDate = (value: string): string => {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-CL");
};

const sortPeriods = (items: PeriodOption[]): PeriodOption[] =>
  [...items].sort((a, b) => {
    const dateDiff = b.fechaInicio.localeCompare(a.fechaInicio);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return a.codigo.localeCompare(b.codigo);
  });

const normalizePeriod = (input: unknown): PeriodOption | null => {
  const period = input as Partial<PeriodOption>;

  if (
    !period
    || !period.id
    || !period.codigo
    || !period.nombre
    || !period.fechaInicio
    || !period.fechaFin
  ) {
    return null;
  }

  return {
    id: String(period.id),
    codigo: String(period.codigo),
    nombre: String(period.nombre),
    estado:
      period.estado === "planificado" || period.estado === "cerrado"
        ? period.estado
        : "activo",
    fechaInicio: String(period.fechaInicio),
    fechaFin: String(period.fechaFin),
  };
};

const normalizePeriodCollection = (input: unknown): PeriodOption[] => {
  const rawPeriods: unknown[] = Array.isArray(input) ? input : [];

  return sortPeriods(
    rawPeriods
      .map((period) => normalizePeriod(period))
      .filter((period): period is PeriodOption => period !== null),
  );
};

export default function AdminImportarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("todos");
  const [periodSearch, setPeriodSearch] = useState("");
  const [newPeriod, setNewPeriod] = useState<NewPeriodDraft>(buildDefaultNewPeriodDraft());
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);
  const [replaceActiveEnrollments, setReplaceActiveEnrollments] = useState(true);
  const [replaceScope, setReplaceScope] = useState<ReplaceScope>("sections");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedPeriod = useMemo(
    () => periods.find((period) => period.id === periodId) ?? null,
    [periodId, periods],
  );

  const filteredPeriods = useMemo(() => {
    const normalizedSearch = periodSearch.trim().toLowerCase();

    return periods.filter((period) => {
      if (periodFilter !== "todos" && period.estado !== periodFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        period.codigo.toLowerCase().includes(normalizedSearch)
        || period.nombre.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [periodFilter, periodSearch, periods]);

  useEffect(() => {
    let active = true;

    const loadPeriods = async () => {
      try {
        const response = await fetch("/api/internal/import-alumnos/periodos", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(String(data.message ?? "No se pudieron cargar los periodos."));
        }

        const normalized = normalizePeriodCollection(data.periods);

        if (!active) {
          return;
        }

        setPeriods(normalized);
        setPeriodId((currentId) => {
          if (currentId && normalized.some((period) => period.id === currentId)) {
            return currentId;
          }

          const preferred =
            normalized.find((period) => period.estado === "activo")
            ?? normalized[0]
            ?? null;
          return preferred?.id ?? "";
        });
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "No se pudieron cargar los periodos.";
        toast.error(message);
      } finally {
        if (active) {
          setIsLoadingPeriods(false);
        }
      }
    };

    void loadPeriods();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isPeriodPickerOpen && !isCreatePeriodOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPeriodPickerOpen(false);
        setIsCreatePeriodOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCreatePeriodOpen, isPeriodPickerOpen]);

  const resolvePeriodFromPayload = (input: unknown, fallbackId: string): PeriodOption => {
    const normalized = normalizePeriod(input);
    if (normalized) {
      return normalized;
    }

    const fallback = periods.find((period) => period.id === fallbackId) ?? selectedPeriod;
    if (fallback) {
      return fallback;
    }

    return {
      id: fallbackId,
      codigo: "",
      nombre: "",
      estado: "activo",
      fechaInicio: "",
      fechaFin: "",
    };
  };

  const openCreatePeriodModal = () => {
    setIsPeriodPickerOpen(false);
    setIsCreatePeriodOpen(true);
    setNewPeriod(buildDefaultNewPeriodDraft());
  };

  const handleCreatePeriod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newPeriod.codigo.trim()) {
      toast.error("Debes indicar un codigo para el periodo.");
      return;
    }

    if (!newPeriod.nombre.trim()) {
      toast.error("Debes indicar un nombre para el periodo.");
      return;
    }

    if (!newPeriod.fechaInicio || !newPeriod.fechaFin) {
      toast.error("Debes completar las fechas de inicio y fin.");
      return;
    }

    if (newPeriod.fechaInicio > newPeriod.fechaFin) {
      toast.error("La fecha de inicio no puede ser mayor que la fecha de fin.");
      return;
    }

    try {
      setIsCreatingPeriod(true);

      const response = await fetch("/api/internal/import-alumnos/periodos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codigo: newPeriod.codigo.trim().toUpperCase(),
          nombre: newPeriod.nombre.trim(),
          fechaInicio: newPeriod.fechaInicio,
          fechaFin: newPeriod.fechaFin,
          estado: newPeriod.estado,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(String(data.message ?? "No se pudo crear el periodo academico."));
        return;
      }

      const createdPeriod = normalizePeriod(data.period);
      if (!createdPeriod) {
        toast.error("El periodo se creo, pero la respuesta no fue valida.");
        return;
      }

      setPeriods((current) => sortPeriods([...current, createdPeriod]));
      setPeriodId(createdPeriod.id);
      setPreview(null);
      setResult(null);
      setIsCreatePeriodOpen(false);
      setPeriodSearch("");
      setPeriodFilter("todos");

      toast.success(`Periodo ${createdPeriod.codigo} creado y seleccionado.`);
    } catch {
      toast.error("No se pudo crear el periodo academico. Intenta nuevamente.");
    } finally {
      setIsCreatingPeriod(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && isValidFile(dropped)) {
      setFile(dropped);
      setPreview(null);
      setResult(null);
    } else {
      toast.error("Solo se aceptan archivos Excel .xlsx");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && isValidFile(selected)) {
      setFile(selected);
      setPreview(null);
      setResult(null);
    } else if (selected) {
      toast.error("Solo se aceptan archivos Excel .xlsx");
    }
  };

  const isValidFile = (f: File) => {
    const name = f.name.toLowerCase();
    return name.endsWith(".xlsx");
  };

  const handlePreview = () => {
    if (!file) return;
    if (!periodId) {
      toast.error("Debes seleccionar un periodo academico antes de previsualizar.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("periodoId", periodId);
        formData.append("replaceActiveEnrollments", String(replaceActiveEnrollments));
        formData.append("replaceScope", replaceScope);

        const response = await fetch("/api/internal/import-alumnos/preview", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.message ?? "Error al previsualizar archivo.");
          return;
        }

        const normalizedPreview: PreviewResult = {
          fileName: String(data.fileName ?? file.name),
          period: resolvePeriodFromPayload(data.period, periodId),
          totalRows: Number(data.totalRows ?? 0),
          readyRows: Number(data.readyRows ?? 0),
          warningRows: Number(data.warningRows ?? 0),
          errorRows: Number(data.errorRows ?? 0),
          uniqueCourses: Number(data.uniqueCourses ?? 0),
          autoCredentialsEstimated: Number(data.autoCredentialsEstimated ?? 0),
          canImport: Boolean(data.canImport),
          errors: Array.isArray(data.errors) ? data.errors.map((item: unknown) => String(item)) : [],
          warnings: Array.isArray(data.warnings) ? data.warnings.map((item: unknown) => String(item)) : [],
          rows: Array.isArray(data.rows)
            ? data.rows.map((item: unknown) => {
              const row = item as Partial<PreviewRow>;
              return {
                lineNumber: Number(row.lineNumber ?? 0),
                curso: String(row.curso ?? ""),
                cursoCanonico: row.cursoCanonico ? String(row.cursoCanonico) : null,
                nombreCompleto: String(row.nombreCompleto ?? ""),
                rutRaw: String(row.rutRaw ?? ""),
                identifier: row.identifier ? String(row.identifier) : null,
                telefono: row.telefono ? String(row.telefono) : null,
                status: row.status === "error" || row.status === "warning" ? row.status : "ok",
                messages: Array.isArray(row.messages)
                  ? row.messages.map((message: unknown) => String(message))
                  : [],
              };
            })
            : [],
          truncated: Boolean(data.truncated),
        };

        setPreview(normalizedPreview);
        setResult(null);

        if (!normalizedPreview.canImport) {
          toast.error("No hay filas validas para importar. Corrige el archivo y vuelve a intentar.");
          return;
        }

        if (normalizedPreview.errorRows > 0 || normalizedPreview.warningRows > 0) {
          toast.warning(
            `Previsualizacion lista: ${normalizedPreview.readyRows} filas listas, ${normalizedPreview.errorRows} con error y ${normalizedPreview.warningRows} con advertencia.`,
          );
        } else {
          toast.success(`Previsualizacion lista: ${normalizedPreview.readyRows} filas listas para importar.`);
        }
      } catch {
        toast.error("Error de conexion. Intenta nuevamente.");
      }
    });
  };

  const handleSubmit = () => {
    if (!file) return;
    if (!preview) {
      toast.error("Primero debes previsualizar el archivo.");
      return;
    }
    if (!periodId) {
      toast.error("Debes seleccionar un periodo academico antes de confirmar.");
      return;
    }
    if (!preview.canImport) {
      toast.error("La previsualizacion no tiene filas validas para importar.");
      return;
    }
    if (preview.errorRows > 0) {
      toast.error("Corrige las filas con error antes de confirmar la importacion.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("periodoId", periodId);
        formData.append("replaceActiveEnrollments", String(replaceActiveEnrollments));
        formData.append("replaceScope", replaceScope);

        const response = await fetch("/api/internal/import-alumnos/confirm", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.message ?? "Error al confirmar importacion.");
          return;
        }

        const normalizedResult: ImportResult = {
          period: resolvePeriodFromPayload(data.period, periodId),
          created: Number(data.created ?? 0),
          updated: Number(data.updated ?? 0),
          coursesCreated: Number(data.coursesCreated ?? 0),
          enrollmentsCreated: Number(data.enrollmentsCreated ?? 0),
          enrollmentsReactivated: Number(data.enrollmentsReactivated ?? 0),
          enrollmentsClosed: Number(data.enrollmentsClosed ?? 0),
          studentsRetired: Number(data.studentsRetired ?? 0),
          autoCredentialsCreated: Number(data.autoCredentialsCreated ?? 0),
          replaceScope: data.replaceScope === "period" ? "period" : "sections",
          errors: Array.isArray(data.errors) ? data.errors.map((item: unknown) => String(item)) : [],
          warnings: Array.isArray(data.warnings) ? data.warnings.map((item: unknown) => String(item)) : [],
          total: Number(data.total ?? 0),
        };

        setResult(normalizedResult);

        if (normalizedResult.errors.length > 0) {
          toast.warning(`Importacion completada con ${normalizedResult.errors.length} error(es).`);
        } else if (normalizedResult.warnings.length > 0) {
          toast.warning(`Importacion completada con ${normalizedResult.warnings.length} advertencia(s).`);
        } else {
          toast.success(
            `Importacion exitosa: ${normalizedResult.created} creados, ${normalizedResult.updated} actualizados, ${normalizedResult.enrollmentsCreated} matriculas nuevas y ${normalizedResult.enrollmentsClosed} cerradas.`,
          );
        }
      } catch {
        toast.error("Error de conexion. Intenta nuevamente.");
      }
    });
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Importar Alumnos a Secciones</h1>
        <p className="mt-1 text-sm text-white/80">
          Flujo OTEC: selecciona periodo, revisa los cursos del Excel como secciones y matricula alumnos de forma controlada.
        </p>
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="grid gap-3 md:grid-cols-4">
          {IMPORT_STEPS.map((step, index) => (
            <div key={step.title} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/60">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-text-primary dark:text-white">{step.title}</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary dark:text-gray-400">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white">
          Formato del Archivo
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-text-secondary dark:text-gray-400">
                <th className="px-2 py-1 font-semibold">Columna</th>
                <th className="px-2 py-1 font-semibold">Obligatorio</th>
                <th className="px-2 py-1 font-semibold">Ejemplo</th>
              </tr>
            </thead>
            <tbody className="text-text-primary dark:text-gray-200">
              <tr><td className="px-2 py-1 font-medium">Curso</td><td className="px-2 py-1">Si</td><td className="px-2 py-1">Computacion Basica</td></tr>
              <tr><td className="px-2 py-1 font-medium">Dias/Hora</td><td className="px-2 py-1">No</td><td className="px-2 py-1">Lunes y Miercoles 18:00</td></tr>
              <tr><td className="px-2 py-1 font-medium">Fecha</td><td className="px-2 py-1">No</td><td className="px-2 py-1">2026-04-02</td></tr>
              <tr><td className="px-2 py-1 font-medium">Nombre</td><td className="px-2 py-1">Si</td><td className="px-2 py-1">Juan Perez (nombre completo)</td></tr>
              <tr><td className="px-2 py-1 font-medium">Rut</td><td className="px-2 py-1">Si</td><td className="px-2 py-1">12.345.678-5</td></tr>
              <tr><td className="px-2 py-1 font-medium">Numero</td><td className="px-2 py-1">No</td><td className="px-2 py-1">+56912345678 o 9 1234 5678</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-text-secondary dark:text-gray-400">
          Las secciones se crean automaticamente si no existen (sin docente, listas para asignar) y se vinculan al periodo que selecciones antes de importar. Los alumnos se crean o actualizan segun corresponda y quedan matriculados en su sección.
        </p>
        <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
          El sistema consolida automaticamente variantes de curso por mayusculas, tildes, espacios y posibles tipeos para evitar duplicados operativos.
        </p>
      </article>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Destino operativo y archivo
        </h2>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/40 p-4 dark:border-gray-700 dark:bg-gray-800/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Periodo academico destino
              </p>

              {selectedPeriod ? (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-text-primary dark:text-gray-100">
                    {selectedPeriod.nombre}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {formatDisplayDate(selectedPeriod.fechaInicio)} al {formatDisplayDate(selectedPeriod.fechaFin)}
                    {" "}
                    <span className="font-medium">({STATUS_LABELS[selectedPeriod.estado]})</span>
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-danger">Aun no seleccionas periodo academico.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsPeriodPickerOpen(true)}
                disabled={isLoadingPeriods || isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CalendarDays className="h-4 w-4" />
                Elegir periodo
              </button>

              <button
                type="button"
                onClick={openCreatePeriodModal}
                disabled={isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200"
              >
                <Plus className="h-4 w-4" />
                Nuevo periodo
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-text-secondary dark:text-gray-400">
            {isLoadingPeriods
              ? "Cargando periodos..."
              : `${periods.length} periodos disponibles. Usa el buscador para trabajar con volumen alto.`}
          </p>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="mt-4 flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-primary/40"
        >
          <FileSpreadsheet className="h-12 w-12 text-primary/50" strokeWidth={1.5} />

          {file ? (
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-text-primary dark:text-white">{file.name}</p>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setResult(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="rounded-lg p-1 text-text-secondary hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Arrastra tu archivo aqui o
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 dark:border-primary/40 dark:bg-primary/20 dark:text-primary-light"
              >
                Seleccionar archivo
              </button>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="hidden" inputMode="text"
          />
        </div>

        {file && (
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <div className="mr-auto grid gap-2">
              <div className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                El importador previsualiza antes de crear alumnos o matriculas.
              </div>
              <label className="flex max-w-2xl cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
                <input
                  type="checkbox"
                  checked={replaceActiveEnrollments}
                  disabled={replaceScope === "period"}
                  onChange={(event) => setReplaceActiveEnrollments(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-primary focus:ring-primary"
                />
                <span>
                  <span className="block font-semibold">Reemplazar matriculas activas de las secciones importadas</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                    Los alumnos que no vengan en el Excel saldran de esas secciones. Si quedan sin cursos activos, pasaran a retirados.
                  </span>
                </span>
              </label>
              <div className="grid max-w-2xl gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="font-semibold text-text-primary dark:text-gray-100">Alcance de reemplazo</p>
                <label className="flex cursor-pointer items-start gap-2 text-text-secondary dark:text-gray-300">
                  <input
                    type="radio"
                    name="replaceScope"
                    value="sections"
                    checked={replaceScope === "sections"}
                    onChange={() => setReplaceScope("sections")}
                    className="mt-0.5 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>
                    <span className="block font-medium text-text-primary dark:text-gray-100">Solo secciones del Excel</span>
                    <span className="block text-xs">Cierra alumnos ausentes solo en las secciones importadas.</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-text-secondary dark:text-gray-300">
                  <input
                    type="radio"
                    name="replaceScope"
                    value="period"
                    checked={replaceScope === "period"}
                    onChange={() => {
                      setReplaceActiveEnrollments(true);
                      setReplaceScope("period");
                    }}
                    className="mt-0.5 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>
                    <span className="block font-medium text-text-primary dark:text-gray-100">Todo el periodo</span>
                    <span className="block text-xs">El periodo queda alineado con este Excel completo.</span>
                  </span>
                </label>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePreview}
              disabled={isPending || !periodId}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 dark:border-primary/40 dark:bg-primary/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Previsualizando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Previsualizar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !preview?.canImport || (preview?.errorRows ?? 0) > 0 || !periodId}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Confirmar Importacion
                </>
              )}
            </button>
          </div>
        )}
      </article>

      {preview && !result && (
        <article className="rounded-2xl border border-primary/20 bg-white p-5 shadow-sm dark:border-primary/30 dark:bg-gray-900 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Previsualizacion
          </h2>

          <p className="mt-2 text-xs text-text-secondary dark:text-gray-400">
            Archivo: {preview.fileName}
          </p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Periodo destino: {preview.period.nombre}
            {" "}
            ({formatDisplayDate(preview.period.fechaInicio)} al {formatDisplayDate(preview.period.fechaFin)})
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-8">
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-primary">{preview.totalRows}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Total filas</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-success">{preview.readyRows}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Listas</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-warning">{preview.warningRows}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Advertencias</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-danger">{preview.errorRows}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Errores</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-primary">{preview.uniqueCourses}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Cursos unicos</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-warning">{preview.autoCredentialsEstimated}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Credenciales temporales (estimadas)</p>
            </div>
          </div>

          <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 text-left dark:bg-gray-800">
                <tr className="text-text-secondary dark:text-gray-400">
                  <th className="px-3 py-2 font-semibold">Fila</th>
                  <th className="px-3 py-2 font-semibold">Curso</th>
                  <th className="px-3 py-2 font-semibold">Curso normalizado</th>
                  <th className="px-3 py-2 font-semibold">Nombre</th>
                  <th className="px-3 py-2 font-semibold">RUT</th>
                  <th className="px-3 py-2 font-semibold">Identificador</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {preview.rows.map((row) => (
                  <tr key={row.lineNumber}>
                    <td className="px-3 py-2 text-text-secondary dark:text-gray-400">{row.lineNumber}</td>
                    <td className="px-3 py-2 text-text-primary dark:text-gray-200">{row.curso || "-"}</td>
                    <td className="px-3 py-2 text-text-primary dark:text-gray-200">{row.cursoCanonico || "-"}</td>
                    <td className="px-3 py-2 text-text-primary dark:text-gray-200">{row.nombreCompleto || "-"}</td>
                    <td className="px-3 py-2 text-text-primary dark:text-gray-200">{row.rutRaw || "-"}</td>
                    <td className="px-3 py-2 text-text-primary dark:text-gray-200">{row.identifier || "-"}</td>
                    <td className="px-3 py-2">
                      {row.status === "error" ? (
                        <span className="text-danger">Error</span>
                      ) : row.status === "warning" ? (
                        <span className="text-warning">Advertencia</span>
                      ) : (
                        <span className="text-success">OK</span>
                      )}
                      {row.messages[0] ? (
                        <p className="mt-1 text-[11px] text-text-secondary dark:text-gray-400">{row.messages[0]}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.truncated ? (
            <p className="mt-3 text-xs text-text-secondary dark:text-gray-400">
              Se muestran las primeras 300 filas de la previsualizacion.
            </p>
          ) : null}

          {preview.warnings.length > 0 && (
            <div className="mt-4 max-h-44 overflow-y-auto rounded-xl border border-warning/20 bg-warning/5 p-4 dark:border-warning/30 dark:bg-warning/10">
              <p className="text-sm font-semibold text-warning">Advertencias de consolidacion:</p>
              <ul className="mt-2 space-y-1">
                {preview.warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-text-secondary dark:text-gray-400">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="mt-4 max-h-44 overflow-y-auto rounded-xl border border-danger/20 bg-danger/5 p-4 dark:border-danger/30 dark:bg-danger/10">
              <p className="text-sm font-semibold text-danger">Errores de previsualizacion:</p>
              <ul className="mt-2 space-y-1">
                {preview.errors.map((error, i) => (
                  <li key={i} className="text-xs text-text-secondary dark:text-gray-400">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      )}

      {result && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Resultado de Importacion
          </h2>

          <p className="mt-2 text-xs text-text-secondary dark:text-gray-400">
            Filas procesadas: {result.total}
          </p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Periodo aplicado: {result.period.nombre}
            {" "}
            ({formatDisplayDate(result.period.fechaInicio)} al {formatDisplayDate(result.period.fechaFin)})
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-success">{result.created}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Creados</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-primary">{result.updated}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Actualizados</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-primary">{result.coursesCreated}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Cursos nuevos</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-success">{result.enrollmentsCreated}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Matriculas nuevas</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-primary">{result.enrollmentsReactivated}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Matriculas reactivadas</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-warning">{result.enrollmentsClosed}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Matriculas cerradas</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-warning">{result.studentsRetired}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Alumnos retirados</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-warning">{result.autoCredentialsCreated}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Credenciales temporales</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className={`text-2xl font-bold ${result.errors.length > 0 ? "text-danger" : "text-success"}`}>
                {result.errors.length}
              </p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Errores</p>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-warning/20 bg-warning/5 p-4 dark:border-warning/30 dark:bg-warning/10">
              <p className="text-sm font-semibold text-warning">Advertencias:</p>
              <ul className="mt-2 space-y-1">
                {result.warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-text-secondary dark:text-gray-400">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-danger/20 bg-danger/5 p-4 dark:border-danger/30 dark:bg-danger/10">
              <p className="text-sm font-semibold text-danger">Errores encontrados:</p>
              <ul className="mt-2 space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-text-secondary dark:text-gray-400">
                    • {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      )}

      {isPeriodPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            aria-label="Cerrar selector de periodo"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsPeriodPickerOpen(false)}
          />
          <div className="relative w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-text-primary dark:text-white">Seleccionar periodo academico</h3>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  Usa busqueda y filtros para manejar muchos periodos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodPickerOpen(false)}
                className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary dark:text-gray-400" />
                  <input
                    value={periodSearch}
                    inputMode="text" onChange={(event) => setPeriodSearch(event.target.value)}
                    placeholder="Buscar por codigo o nombre"
                    className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </label>

                <select
                  value={periodFilter}
                  onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
                  className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="planificado">Planificados</option>
                  <option value="cerrado">Cerrados</option>
                </select>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
                {filteredPeriods.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-text-secondary dark:text-gray-400">
                      No hay periodos que coincidan con tu busqueda.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredPeriods.map((period) => {
                      const isSelected = period.id === periodId;

                      return (
                        <li key={period.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setPeriodId(period.id);
                              setPreview(null);
                              setResult(null);
                              setIsPeriodPickerOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left transition-colors ${
                              isSelected
                                ? "bg-primary/10"
                                : "hover:bg-gray-50 dark:hover:bg-gray-800/70"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-text-primary dark:text-gray-100">
                                {period.nombre}
                              </p>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASS[period.estado]}`}
                              >
                                {STATUS_LABELS[period.estado]}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                              {formatDisplayDate(period.fechaInicio)} al {formatDisplayDate(period.fechaFin)}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
              <button
                type="button"
                onClick={openCreatePeriodModal}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200"
              >
                <Plus className="h-4 w-4" />
                Crear periodo
              </button>

              <button
                type="button"
                onClick={() => setIsPeriodPickerOpen(false)}
                className="inline-flex h-10 items-center rounded-xl border border-gray-300 px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreatePeriodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            aria-label="Cerrar creación de periodo"
            className="absolute inset-0 cursor-default"
            onClick={() => {
              if (!isCreatingPeriod) {
                setIsCreatePeriodOpen(false);
              }
            }}
          />
          <div className="relative w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-text-primary dark:text-white">Nuevo periodo academico</h3>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  Crea el periodo y queda seleccionado automaticamente para la importacion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isCreatingPeriod) {
                    setIsCreatePeriodOpen(false);
                  }
                }}
                className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-800"
                disabled={isCreatingPeriod}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-4 p-5">
              {/* Mes + Año → auto-genera código, nombre y fechas */}
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-text-secondary dark:text-gray-400">Mes</span>
                  <select
                    value={Number(newPeriod.codigo.split("-")[1] || new Date().getMonth() + 1)}
                    onChange={(e) => {
                      const mes = Number(e.target.value);
                      const anio = Number(newPeriod.codigo.split("-")[0] || new Date().getFullYear());
                      const last = lastDayOfMonth(anio, mes);
                      const mm = String(mes).padStart(2, "0");
                      const dd = String(last).padStart(2, "0");
                      setNewPeriod((cur) => ({
                        ...cur,
                        codigo: `${anio}-${mm}`,
                        nombre: `${MESES_ES[mes - 1]} ${anio}`,
                        fechaInicio: `${anio}-${mm}-01`,
                        fechaFin: `${anio}-${mm}-${dd}`,
                      }));
                    }}
                    className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  >
                    {MESES_ES.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-text-secondary dark:text-gray-400">Año</span>
                  <input
                    type="number"
                    min={2020}
                    max={2035}
                    value={Number(newPeriod.codigo.split("-")[0] || new Date().getFullYear())}
                    inputMode="numeric" onChange={(e) => {
                      const anio = Number(e.target.value);
                      const mes = Number(newPeriod.codigo.split("-")[1] || new Date().getMonth() + 1);
                      const last = lastDayOfMonth(anio, mes);
                      const mm = String(mes).padStart(2, "0");
                      const dd = String(last).padStart(2, "0");
                      setNewPeriod((cur) => ({
                        ...cur,
                        codigo: `${anio}-${mm}`,
                        nombre: `${MESES_ES[mes - 1]} ${anio}`,
                        fechaInicio: `${anio}-${mm}-01`,
                        fechaFin: `${anio}-${mm}-${dd}`,
                      }));
                    }}
                    className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-text-secondary dark:text-gray-400">Estado</span>
                  <select
                    value={newPeriod.estado}
                    onChange={(event) => {
                      setNewPeriod((current) => ({
                        ...current,
                        estado: event.target.value as PeriodStatus,
                      }));
                    }}
                    className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  >
                    <option value="activo">Activo</option>
                    <option value="planificado">Planificado</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </label>
              </div>

              {/* Preview del período generado */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 dark:border-primary/30 dark:bg-primary/10">
                <p className="text-sm font-semibold text-primary dark:text-primary-light">
                  {newPeriod.nombre}
                </p>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  {newPeriod.fechaInicio} → {newPeriod.fechaFin} · Código: {newPeriod.codigo}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-text-secondary dark:text-gray-400">Fecha inicio (ajustar si necesario)</span>
                  <input
                    type="date"
                    value={newPeriod.fechaInicio}
                    inputMode="text" onChange={(event) => {
                      setNewPeriod((current) => ({ ...current, fechaInicio: event.target.value }));
                    }}
                    className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    required
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-text-secondary dark:text-gray-400">Fecha fin (ajustar si necesario)</span>
                  <input
                    type="date"
                    value={newPeriod.fechaFin}
                    inputMode="text" onChange={(event) => {
                      setNewPeriod((current) => ({ ...current, fechaFin: event.target.value }));
                    }}
                    className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    required
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatePeriodOpen(false)}
                  disabled={isCreatingPeriod}
                  className="inline-flex h-10 items-center rounded-xl border border-gray-300 px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPeriod}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingPeriod ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Crear periodo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
