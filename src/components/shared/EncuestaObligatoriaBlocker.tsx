import { ClipboardList, Lock } from "lucide-react";
import Link from "next/link";

import type { PendingSurvey } from "@/lib/encuestaBlocking";

type Props = {
  pendientes: PendingSurvey[];
};

export function EncuestaObligatoriaBlocker({ pendientes }: Props) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full max-w-md space-y-6">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
          <Lock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-text-primary dark:text-white">
            Encuesta obligatoria pendiente
          </h2>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Debes completar{" "}
            {pendientes.length === 1 ? "la siguiente encuesta" : `las ${pendientes.length} encuestas siguientes`}{" "}
            para continuar usando el portal.
          </p>
        </div>

        {/* Surveys list */}
        <div className="space-y-3">
          {pendientes.map((enc) => (
            <div
              key={enc.evaluacionId}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20"
            >
              <div className="flex items-start gap-3">
                <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">{enc.titulo}</p>
                  {enc.instrucciones && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 line-clamp-2">
                      {enc.instrucciones}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={`/encuestas/${enc.evaluacionId}`}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-600/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:bg-amber-700 active:scale-[0.97] dark:bg-amber-700 dark:hover:bg-amber-600"
              >
                Responder ahora
              </Link>
            </div>
          ))}
        </div>

        <p className="text-xs text-text-muted dark:text-gray-500">
          Una vez que completes todas las encuestas obligatorias, tendrás acceso completo al portal.
        </p>
      </div>
    </div>
  );
}
