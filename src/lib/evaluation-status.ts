export type EvaluationWindowStatus =
  | "borrador"
  | "programada"
  | "disponible"
  | "vencida";

export const getEvaluationWindowStatus = (input: {
  publicada: boolean | null | undefined;
  fechaInicio?: Date | null;
  fechaLimite?: Date | null;
  now?: Date;
}): EvaluationWindowStatus => {
  if (!input.publicada) {
    return "borrador";
  }

  const now = input.now ?? new Date();

  if (input.fechaInicio && input.fechaInicio > now) {
    return "programada";
  }

  if (input.fechaLimite && input.fechaLimite < now) {
    return "vencida";
  }

  return "disponible";
};

export const EVALUATION_WINDOW_LABELS: Record<EvaluationWindowStatus, string> = {
  borrador: "Borrador",
  programada: "Programada",
  disponible: "Disponible",
  vencida: "Vencida",
};

export const EVALUATION_WINDOW_TONES: Record<EvaluationWindowStatus, string> = {
  borrador:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  programada:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  disponible:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  vencida:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};
