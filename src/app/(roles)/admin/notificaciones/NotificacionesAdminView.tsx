"use client";

import { useState, useTransition, useRef, useEffect, useCallback, useMemo } from "react";

import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe,
  Search,
  Send,
  Trash2,
  Users,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { eliminarNotificacionAction, enviarNotificacionAction } from "@/actions/notificaciones";

type Usuario = { id: string; nombre: string; apellido: string; rut: string | null; rol: string };
type Asignatura = {
  id: string;
  nombre: string;
  codigo: string | null;
  fechaInicio: string | Date | null;
  turno: "manana" | "tarde" | "vespertino" | null;
};
type Notificacion = {
  id: string;
  titulo: string;
  contenido: string;
  tipo: string | null;
  asignaturaNombre: string | null;
  createdAt: Date | null;
  emisorNombre: string | null;
  emisorApellido: string | null;
  totalDestinatarios: number;
  destinatariosPreview: string[];
};

type Props = {
  asignaturas: Asignatura[];
  usuarios: Usuario[];
  historial: Notificacion[];
};

const TIPO_CONFIG: Record<
  string,
  { label: string; shortLabel: string; Icon: React.ElementType; color: string; bg: string; border: string }
> = {
  general: {
    label: "Global (alumnos y docentes)",
    shortLabel: "Global",
    Icon: Globe,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200/80 dark:border-blue-900/40",
  },
  curso: {
    label: "Por curso (solo alumnos del curso)",
    shortLabel: "Curso",
    Icon: BookOpen,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200/80 dark:border-amber-900/40",
  },
  individual: {
    label: "Personas específicas",
    shortLabel: "Individual",
    Icon: UserCheck,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200/80 dark:border-purple-900/40",
  },
};

const ROL_BADGE: Record<string, string> = {
  alumno: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  docente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const TURNO_LABEL: Record<"manana" | "tarde" | "vespertino", string> = {
  manana: "Manana",
  tarde: "Tarde",
  vespertino: "Vespertino",
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toSafeDate(value: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatCourseDate(value: string | Date | null): string {
  const date = toSafeDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function buildAsignaturaMeta(asignatura: Asignatura): string {
  const parts: string[] = [];

  if (asignatura.codigo) {
    parts.push(`Cod: ${asignatura.codigo}`);
  }

  const formattedDate = formatCourseDate(asignatura.fechaInicio);
  if (formattedDate) {
    parts.push(`Inicio: ${formattedDate}`);
  }

  if (asignatura.turno) {
    parts.push(`Turno: ${TURNO_LABEL[asignatura.turno]}`);
  }

  return parts.join(" · ");
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function HistorialItem({ n, onDelete }: { n: Notificacion; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const tipo = TIPO_CONFIG[n.tipo ?? "general"] ?? TIPO_CONFIG.general;
  const TipoIcon = tipo.Icon;

  const emisorName =
    n.emisorNombre && n.emisorApellido
      ? `${n.emisorNombre} ${n.emisorApellido}`
      : n.emisorNombre ?? "Administrador";

  const emisorInitials = emisorName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");

  const destinatariosText =
    n.tipo === "individual"
      ? n.destinatariosPreview.length > 0
        ? n.destinatariosPreview.join(", ") +
          (n.totalDestinatarios > n.destinatariosPreview.length
            ? ` +${n.totalDestinatarios - n.destinatariosPreview.length} más`
            : "")
        : `${n.totalDestinatarios} persona${n.totalDestinatarios !== 1 ? "s" : ""}`
      : n.tipo === "curso"
      ? `${n.totalDestinatarios} alumno${n.totalDestinatarios !== 1 ? "s" : ""} del curso`
      : `${n.totalDestinatarios} persona${n.totalDestinatarios !== 1 ? "s" : ""}`;

  return (
    <article
      className={`rounded-2xl border ${tipo.border} ${tipo.bg} p-4 transition-all`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Tipo icon */}
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tipo.bg} border ${tipo.border}`}>
          <TipoIcon className={`h-4 w-4 ${tipo.color}`} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Title + badge */}
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="flex-1 font-semibold text-text-primary dark:text-white">
              {n.titulo}
            </h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tipo.color} ${tipo.bg}`}>
              {tipo.shortLabel}
            </span>
          </div>

          {/* Preview / expanded content */}
          <p className={`mt-1 text-sm text-text-secondary dark:text-gray-400 ${!expanded ? "line-clamp-2" : ""}`}>
            {n.contenido}
          </p>

          {n.contenido.length > 100 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={`mt-1 flex items-center gap-0.5 text-xs font-medium ${tipo.color} hover:underline`}
            >
              {expanded ? (
                <><ChevronUp className="h-3 w-3" /> Ver menos</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> Ver más</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Footer metadata */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/5 pt-3 dark:border-white/5">
        {/* Emisor */}
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-[8px] font-bold text-white">
            {emisorInitials}
          </div>
          <span className="text-xs text-text-secondary dark:text-gray-400">
            <span className="font-medium text-text-primary dark:text-white">{emisorName}</span>
          </span>
        </div>

        {/* Destinatarios */}
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-text-muted dark:text-gray-500" />
          <span className="text-xs text-text-secondary dark:text-gray-400">
            → <span className="font-medium">{destinatariosText}</span>
          </span>
        </div>

        {/* Curso name si aplica */}
        {n.asignaturaNombre && (
          <div className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-text-muted dark:text-gray-500" />
            <span className="text-xs text-text-secondary dark:text-gray-400">{n.asignaturaNombre}</span>
          </div>
        )}

        {/* Fecha */}
        <span className="text-xs text-text-muted dark:text-gray-500">
          {formatRelativeTime(n.createdAt)}
        </span>

        {/* Borrar */}
        <div className="ml-auto">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
              Borrar
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-secondary dark:text-gray-400">¿Confirmar?</span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                No
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  startDelete(async () => {
                    const result = await eliminarNotificacionAction(n.id);
                    if (result.ok) {
                      toast.success("Notificación eliminada.");
                      onDelete(n.id);
                    } else {
                      toast.error(result.message ?? "No se pudo eliminar.");
                    }
                    setConfirmDelete(false);
                  });
                }}
                className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "..." : "Sí"}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function NotificacionesAdminView({ asignaturas, usuarios, historial }: Props) {
  const [localHistorial, setLocalHistorial] = useState<Notificacion[]>(historial);
  const [tipo, setTipo] = useState<"general" | "curso" | "individual">("general");
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [asignaturaId, setAsignaturaId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [buscar, setBuscar] = useState("");
  const [isPending, startTransition] = useTransition();

  // Combobox de curso
  const [cursoQuery, setCursoQuery] = useState("");
  const [cursoOpen, setCursoOpen] = useState(false);
  const [cursoHighlight, setCursoHighlight] = useState(0);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedCourseQuery = normalizeSearchText(cursoQuery);

  const cursosFiltrados = useMemo(() => {
    if (!normalizedCourseQuery) {
      return asignaturas;
    }

    return asignaturas.filter((a) => {
      const indexableText = normalizeSearchText(
        `${a.nombre} ${a.codigo ?? ""} ${formatCourseDate(a.fechaInicio)} ${a.turno ? TURNO_LABEL[a.turno] : ""}`,
      );

      return indexableText.includes(normalizedCourseQuery);
    });
  }, [asignaturas, normalizedCourseQuery]);

  const cursoSeleccionado = asignaturas.find((a) => a.id === asignaturaId);

  const handleSelectCurso = useCallback((a: Asignatura) => {
    setAsignaturaId(a.id);
    setCursoQuery("");
    setCursoOpen(false);
    setCursoHighlight(0);
  }, []);

  const handleClearCurso = useCallback(() => {
    setAsignaturaId("");
    setCursoQuery("");
    setCursoHighlight(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Cierra al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setCursoOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleComboboxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!cursoOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setCursoOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      setCursoHighlight((h) => Math.min(h + 1, cursosFiltrados.length - 1));
    } else if (e.key === "ArrowUp") {
      setCursoHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = cursosFiltrados[cursoHighlight];
      if (item) handleSelectCurso(item);
    } else if (e.key === "Escape") {
      setCursoOpen(false);
    }
  };

  const usuariosFiltrados = buscar.trim()
    ? usuarios.filter(
        (u) =>
          !selectedIds.includes(u.id) &&
          `${u.nombre} ${u.apellido} ${u.rut ?? ""} ${u.rol}`
            .toLowerCase()
            .includes(buscar.toLowerCase()),
      )
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (tipo === "curso" && !asignaturaId) {
      toast.error("Debes seleccionar un curso antes de enviar.");
      inputRef.current?.focus();
      return;
    }
    if (tipo === "individual" && selectedIds.length === 0) {
      toast.error("Debes seleccionar al menos una persona.");
      return;
    }

    startTransition(async () => {
      const result = await enviarNotificacionAction({
        titulo,
        contenido,
        tipo,
        asignaturaId: tipo === "curso" ? asignaturaId : undefined,
        usuarioIds: tipo === "individual" ? selectedIds : undefined,
      });

      if (result.ok) {
        toast.success("Notificación enviada correctamente.");
        setTitulo("");
        setContenido("");
        setAsignaturaId("");
        setCursoQuery("");
        setSelectedIds([]);
        setBuscar("");
      } else {
        toast.error(result.message ?? "No fue posible enviar la notificación.");
      }
    });
  };

  // Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hoy = localHistorial.filter(
    (n) => n.createdAt && new Date(n.createdAt) >= today,
  ).length;
  const totalDestinatariosTotal = localHistorial.reduce(
    (acc, n) => acc + (n.totalDestinatarios ?? 0),
    0,
  );

  const tipoInfo = TIPO_CONFIG[tipo] ?? TIPO_CONFIG.general;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Total enviadas
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-white">
            {localHistorial.length}
          </p>
        </article>
        <article className="rounded-2xl border border-blue-200/80 bg-blue-50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/30">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Hoy
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-200">{hoy}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200/80 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Alcance
            </p>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-200">
            {totalDestinatariosTotal.toLocaleString("es-CL")}
          </p>
        </article>
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        {/* Left: form */}
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Send className="h-3.5 w-3.5" />
            </span>
            Nueva Notificación
          </h2>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Envía mensajes a alumnos y docentes de forma masiva o individual.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Tipo selector — botones */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Destinatarios
              </label>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
                {(["general", "curso", "individual"] as const).map((t) => {
                  const cfg = TIPO_CONFIG[t];
                  const TIcon = cfg.Icon;
                  const isActive = tipo === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTipo(t);
                        setSelectedIds([]);
                        setBuscar("");
                      }}
                      className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-semibold transition-all ${
                        isActive
                          ? `${cfg.bg} ${cfg.color} border ${cfg.border} shadow-sm`
                          : "text-text-secondary hover:bg-white dark:text-gray-400 dark:hover:bg-gray-700"
                      }`}
                    >
                      <TIcon className="h-4 w-4" />
                      {cfg.shortLabel}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-text-muted dark:text-gray-500">{tipoInfo.label}</p>
            </div>

            {/* Selector de curso — Combobox con búsqueda */}
            {tipo === "curso" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Curso
                  {asignaturas.length > 0 && (
                    <span className="ml-1.5 font-normal normal-case text-text-muted dark:text-gray-500">
                      ({asignaturas.length} disponibles)
                    </span>
                  )}
                </label>

                {/* Input oculto para validación nativa */}
                <input type="hidden" name="asignaturaId" value={asignaturaId} required />

                <div ref={comboboxRef} className="relative">
                  {/* Trigger / Input */}
                  {cursoSeleccionado ? (
                    /* Chip del curso seleccionado */
                    <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-700/60 dark:bg-amber-950/30">
                      <BookOpen className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-amber-800 dark:text-amber-200">
                          {cursoSeleccionado.nombre}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-amber-700/90 dark:text-amber-300/90">
                          {buildAsignaturaMeta(cursoSeleccionado)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearCurso}
                        aria-label="Cambiar curso"
                        className="shrink-0 rounded-full p-0.5 text-amber-500 transition-colors hover:bg-amber-200/60 hover:text-amber-700 dark:hover:bg-amber-800/40"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Campo de búsqueda */
                    <div
                      className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 transition-all dark:bg-gray-800 ${
                        cursoOpen
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <Search className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                      <input
                        ref={inputRef}
                        id="notif-asignatura"
                        type="text"
                        value={cursoQuery}
                        onChange={(e) => {
                          setCursoQuery(e.target.value);
                          setCursoOpen(true);
                          setCursoHighlight(0);
                        }}
                        onFocus={() => setCursoOpen(true)}
                        onKeyDown={handleComboboxKeyDown}
                        placeholder="Buscar por nombre, codigo, fecha o turno…"
                        autoComplete="off"
                        role="combobox"
                        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-gray-400 focus:outline-none dark:text-gray-100"
                        aria-haspopup="listbox"
                        aria-expanded={cursoOpen}
                        aria-controls={cursoOpen ? "notif-asignatura-listbox" : undefined}
                        aria-autocomplete="list"
                      />
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
                          cursoOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  )}

                  {/* Dropdown de resultados */}
                  {cursoOpen && !cursoSeleccionado && (
                    <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                      {/* Contador */}
                      <div className="border-b border-gray-100 px-3 py-1.5 dark:border-gray-700">
                        <span className="text-[11px] text-text-muted dark:text-gray-500">
                          {cursosFiltrados.length === 0
                            ? "Sin resultados"
                            : `${cursosFiltrados.length} curso${cursosFiltrados.length !== 1 ? "s" : ""}`}
                          {cursoQuery && ` para "${cursoQuery}"`}
                        </span>
                      </div>

                      <ul
                        id="notif-asignatura-listbox"
                        role="listbox"
                        aria-label="Cursos disponibles"
                        className="max-h-56 overflow-y-auto overscroll-contain"
                      >
                        {cursosFiltrados.length === 0 ? (
                          <li className="flex flex-col items-center gap-1 px-4 py-6 text-center">
                            <Search className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                            <span className="text-sm text-text-muted dark:text-gray-500">
                              No se encontró ningún curso
                            </span>
                          </li>
                        ) : (
                          cursosFiltrados.map((a, idx) => {
                            const isHighlighted = idx === cursoHighlight;
                            const metaText = buildAsignaturaMeta(a);

                            return (
                              <li
                                key={a.id}
                                role="option"
                                aria-selected={isHighlighted}
                                onMouseEnter={() => setCursoHighlight(idx)}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectCurso(a);
                                }}
                                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors ${
                                  isHighlighted
                                    ? "bg-amber-50 dark:bg-amber-950/30"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                }`}
                              >
                                <div
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                                    isHighlighted
                                      ? "bg-amber-100 dark:bg-amber-900/40"
                                      : "bg-gray-100 dark:bg-gray-700"
                                  }`}
                                >
                                  <BookOpen
                                    className={`h-3 w-3 ${
                                      isHighlighted
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-gray-400 dark:text-gray-500"
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate text-sm text-text-primary dark:text-gray-100">
                                    {a.nombre}
                                  </span>
                                  {metaText && (
                                    <span className="mt-0.5 block truncate text-[11px] text-text-muted dark:text-gray-500">
                                      {metaText}
                                    </span>
                                  )}
                                </div>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Hint */}
                {!cursoSeleccionado && (
                  <p className="text-[11px] text-text-muted dark:text-gray-500">
                    Filtra por nombre/codigo/fecha/turno · ↑↓ navegar · Enter seleccionar
                  </p>
                )}
              </div>
            )}

            {/* Selector de personas */}
            {tipo === "individual" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Personas{" "}
                  {selectedIds.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      {selectedIds.length} seleccionadas
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Buscar por nombre, RUT o rol..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                {usuariosFiltrados.length > 0 && (
                  <ul className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    {usuariosFiltrados.slice(0, 12).map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIds((prev) => [...prev, u.id]);
                            setBuscar("");
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-primary/5 dark:hover:bg-primary/10"
                        >
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ROL_BADGE[u.rol] ?? ""}`}>
                            {u.rol}
                          </span>
                          <span className="font-medium">{u.nombre} {u.apellido}</span>
                          {u.rut && <span className="text-xs text-text-muted">{u.rut}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIds.map((id) => {
                      const u = usuarios.find((x) => x.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/20 dark:text-primary-light"
                        >
                          {u ? `${u.nombre} ${u.apellido}` : id.slice(0, 8)}
                          <button
                            type="button"
                            onClick={() => setSelectedIds((prev) => prev.filter((x) => x !== id))}
                            className="ml-0.5 text-primary/60 hover:text-primary"
                            aria-label="Quitar"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Título */}
            <div className="space-y-1.5">
              <label htmlFor="notif-titulo" className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Título
              </label>
              <input
                id="notif-titulo"
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                maxLength={200}
                placeholder="Ej: Información importante sobre clases"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Mensaje */}
            <div className="space-y-1.5">
              <label htmlFor="notif-contenido" className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Mensaje
              </label>
              <textarea
                id="notif-contenido"
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                required
                maxLength={2000}
                rows={4}
                placeholder="Escribe el mensaje para los destinatarios..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="text-right text-[11px] text-text-muted dark:text-gray-500">
                {contenido.length}/2000
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending || !titulo.trim() || !contenido.trim()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isPending ? "Enviando…" : "Enviar Notificación"}
            </button>
          </form>
        </article>

        {/* Right: historial */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Historial de Notificaciones
            </h2>
            {localHistorial.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {localHistorial.length}
              </span>
            )}
          </div>

          {localHistorial.length === 0 ? (
            <article className="flex flex-col items-center justify-center rounded-2xl border border-gray-200/80 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text-primary dark:text-white">
                Sin notificaciones enviadas
              </h3>
              <p className="mt-1.5 max-w-xs text-sm text-text-secondary dark:text-gray-400">
                Las notificaciones que envíes aparecerán aquí con el detalle de destinatarios y emisor.
              </p>
            </article>
          ) : (
            <div className="space-y-3">
              {localHistorial.map((n) => (
                <HistorialItem
                  key={n.id}
                  n={n}
                  onDelete={(id) => setLocalHistorial((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
