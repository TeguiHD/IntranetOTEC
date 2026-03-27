"use client";

import { useState, useTransition } from "react";

import { Bell, Send } from "lucide-react";
import { toast } from "sonner";

import { enviarNotificacionAction } from "@/actions/notificaciones";

type Asignatura = { id: string; nombre: string };
type Alumno = { id: string; nombre: string; apellido: string; rut: string | null };
type Notificacion = {
  id: string;
  titulo: string;
  contenido: string;
  tipo: string | null;
  asignaturaNombre: string | null;
  createdAt: Date | null;
};

type Props = {
  asignaturas: Asignatura[];
  alumnos: Alumno[];
  historial: Notificacion[];
};

const TIPO_LABELS: Record<string, string> = {
  general: "Global (todos los alumnos)",
  curso: "Por curso",
  individual: "Alumnos específicos",
};

export function NotificacionesAdminView({ asignaturas, alumnos, historial }: Props) {
  const [tipo, setTipo] = useState<"general" | "curso" | "individual">("general");
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [asignaturaId, setAsignaturaId] = useState("");
  const [selectedAlumnos, setSelectedAlumnos] = useState<string[]>([]);
  const [buscarAlumno, setBuscarAlumno] = useState("");
  const [isPending, startTransition] = useTransition();

  const alumnosFiltrados = buscarAlumno.trim()
    ? alumnos.filter(
        (a) =>
          !selectedAlumnos.includes(a.id) &&
          `${a.nombre} ${a.apellido} ${a.rut ?? ""}`
            .toLowerCase()
            .includes(buscarAlumno.toLowerCase()),
      )
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await enviarNotificacionAction({
        titulo,
        contenido,
        tipo,
        asignaturaId: tipo === "curso" ? asignaturaId : undefined,
        alumnoIds: tipo === "individual" ? selectedAlumnos : undefined,
      });

      if (result.ok) {
        toast.success("Notificación enviada correctamente.");
        setTitulo("");
        setContenido("");
        setSelectedAlumnos([]);
        setBuscarAlumno("");
      } else {
        toast.error(result.message ?? "No fue posible enviar la notificación.");
      }
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Formulario */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white">
          <Send className="h-4 w-4 text-primary" />
          Nueva Notificación
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Tipo */}
          <div className="space-y-1.5">
            <label htmlFor="notif-tipo" className="text-sm font-medium text-text-primary dark:text-gray-200">
              Destinatarios
            </label>
            <select
              id="notif-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "general" | "curso" | "individual")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="general">{TIPO_LABELS.general}</option>
              <option value="curso">{TIPO_LABELS.curso}</option>
              <option value="individual">{TIPO_LABELS.individual}</option>
            </select>
          </div>

          {/* Selector de curso */}
          {tipo === "curso" && (
            <div className="space-y-1.5">
              <label htmlFor="notif-asignatura" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Curso
              </label>
              <select
                id="notif-asignatura"
                value={asignaturaId}
                onChange={(e) => setAsignaturaId(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Selecciona un curso...</option>
                {asignaturas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de alumnos */}
          {tipo === "individual" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary dark:text-gray-200">
                Alumnos ({selectedAlumnos.length} seleccionados)
              </label>
              <input
                type="text"
                value={buscarAlumno}
                onChange={(e) => setBuscarAlumno(e.target.value)}
                placeholder="Buscar por nombre o RUT..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              {alumnosFiltrados.length > 0 && (
                <ul className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  {alumnosFiltrados.slice(0, 10).map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAlumnos((prev) => [...prev, a.id]);
                          setBuscarAlumno("");
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-primary/5 dark:hover:bg-primary/10"
                      >
                        {a.nombre} {a.apellido}
                        {a.rut && <span className="ml-2 text-xs text-text-muted">{a.rut}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedAlumnos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedAlumnos.map((id) => {
                    const alumno = alumnos.find((a) => a.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:bg-primary/20 dark:text-primary-light"
                      >
                        {alumno ? `${alumno.nombre} ${alumno.apellido}` : id.slice(0, 8)}
                        <button
                          type="button"
                          onClick={() => setSelectedAlumnos((prev) => prev.filter((x) => x !== id))}
                          className="ml-1 text-primary/60 hover:text-primary"
                          aria-label="Quitar"
                        >
                          &times;
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Titulo */}
          <div className="space-y-1.5">
            <label htmlFor="notif-titulo" className="text-sm font-medium text-text-primary dark:text-gray-200">
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

          {/* Contenido */}
          <div className="space-y-1.5">
            <label htmlFor="notif-contenido" className="text-sm font-medium text-text-primary dark:text-gray-200">
              Mensaje
            </label>
            <textarea
              id="notif-contenido"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              required
              maxLength={2000}
              rows={4}
              placeholder="Escribe el mensaje para los alumnos..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
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

      {/* Historial */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white">
          <Bell className="h-4 w-4 text-primary" />
          Notificaciones Enviadas
        </h2>

        {historial.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            Aún no has enviado notificaciones.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {historial.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-text-primary dark:text-white">{n.titulo}</h3>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-primary dark:bg-primary/20 dark:text-primary-light">
                    {TIPO_LABELS[n.tipo ?? "general"] ?? n.tipo}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-text-secondary dark:text-gray-400">
                  {n.contenido}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-text-muted dark:text-gray-500">
                  {n.createdAt && (
                    <span>{new Date(n.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                  {n.asignaturaNombre && (
                    <span className="text-primary dark:text-primary-light">Curso: {n.asignaturaNombre}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
