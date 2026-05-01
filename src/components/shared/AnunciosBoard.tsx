import type { AnuncioItem } from "@/actions/anuncios";

type AnunciosBoardProps = {
  anuncios: AnuncioItem[];
  asignaturaId: string;
  puedeEliminar?: boolean;
  eliminarAction?: (formData: FormData) => Promise<void>;
};

function formatFechaAnuncio(value: Date | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function AnunciosBoard({
  anuncios,
  asignaturaId,
  puedeEliminar = false,
  eliminarAction,
}: AnunciosBoardProps) {
  if (anuncios.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-text-primary dark:text-white">
          Anuncios del curso
        </h3>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {anuncios.map((a) => (
          <li key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    {a.titulo}
                  </p>
                  {a.fijado && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      Fijado
                    </span>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary dark:text-gray-300">
                  {a.contenido}
                </p>
                <p className="mt-2 text-xs text-text-muted dark:text-gray-500">
                  {a.autorNombre} · {formatFechaAnuncio(a.createdAt)}
                </p>
              </div>
              {puedeEliminar && eliminarAction && (
                <form action={eliminarAction}>
                  <input type="hidden" name="anuncioId" value={a.id} />
                  <input type="hidden" name="asignaturaId" value={asignaturaId} />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-gray-100 hover:text-danger dark:hover:bg-gray-800 dark:hover:text-red-400"
                    title="Eliminar anuncio"
                    aria-label="Eliminar anuncio"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
