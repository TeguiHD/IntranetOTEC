"use client";

import { useEffect, useRef, useState } from "react";

import { MessageSquare, Send, Trash2 } from "lucide-react";
import useSWR from "swr";

import { eliminarMensajeAction, enviarMensajeAction, listarMensajesAction } from "@/actions/mensajes";

type Mensaje = Awaited<ReturnType<typeof listarMensajesAction>>[number];

const ROLE_LABEL: Record<string, string> = {
  docente: "Docente",
  alumno: "Alumno",
  admin: "Admin",
};

const ROLE_COLOR: Record<string, string> = {
  docente: "text-primary dark:text-primary-light",
  alumno: "text-text-secondary dark:text-gray-400",
  admin: "text-amber-600 dark:text-amber-400",
};

function formatHora(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatFechaCorta(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

type Props = {
  asignaturaId: string;
  asignaturaNombre: string;
};

export function ChatAsignatura({ asignaturaId, asignaturaNombre }: Props) {
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: mensajes = [], mutate } = useSWR<Mensaje[]>(
    ["mensajes", asignaturaId],
    () => listarMensajesAction(asignaturaId),
    { refreshInterval: 15000 },
  );

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setSending(true);
    setError(null);
    const result = await enviarMensajeAction(asignaturaId, texto);
    setSending(false);
    if (result.ok) {
      setTexto("");
      mutate();
    } else {
      setError(result.error ?? "Error al enviar");
    }
  };

  const eliminar = async (id: string) => {
    await eliminarMensajeAction(id);
    mutate();
  };

  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Encabezado */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-text-primary dark:text-white">
          Chat · {asignaturaNombre}
        </h2>
        <span className="ml-auto text-xs text-text-muted dark:text-gray-500">
          {mensajes.length} mensajes
        </span>
      </div>

      {/* Mensajes */}
      <div className="h-64 overflow-y-auto px-4 py-3 space-y-2">
        {mensajes.length === 0 ? (
          <p className="pt-8 text-center text-sm text-text-secondary dark:text-gray-400">
            Aún no hay mensajes en este curso.
          </p>
        ) : (
          mensajes.map((msg) => (
            <div
              key={msg.id}
              className={`group flex gap-2 ${msg.esMio ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  msg.esMio
                    ? "rounded-tr-sm bg-primary text-white"
                    : "rounded-tl-sm bg-gray-100 text-text-primary dark:bg-gray-800 dark:text-gray-100"
                }`}
              >
                {/* Nombre del emisor */}
                {!msg.esMio && (
                  <p className={`mb-0.5 text-[10px] font-semibold ${ROLE_COLOR[msg.emisorRol ?? ""] ?? ""}`}>
                    {msg.emisorNombre} {msg.emisorApellido} · {ROLE_LABEL[msg.emisorRol ?? ""] ?? msg.emisorRol}
                  </p>
                )}
                <p className="break-words leading-relaxed">{msg.contenido}</p>
                <p className={`mt-0.5 text-[10px] ${msg.esMio ? "text-white/60 text-right" : "text-text-muted dark:text-gray-500"}`}>
                  {formatFechaCorta(msg.creadoAt)} {formatHora(msg.creadoAt)}
                </p>
              </div>
              {/* Botón eliminar */}
              {msg.esMio && (
                <button
                  type="button"
                  onClick={() => eliminar(msg.id)}
                  className="mt-1 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-muted opacity-0 transition-opacity hover:bg-gray-100 hover:text-danger group-hover:flex group-hover:opacity-100 dark:hover:bg-gray-800"
                  title="Eliminar mensaje"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {error && (
        <p className="px-4 text-xs text-danger">{error}</p>
      )}
      <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={texto}
            inputMode="text"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Escribe un mensaje…"
            maxLength={1000}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={enviar}
            aria-label="Enviar mensaje"
            disabled={sending || !texto.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
