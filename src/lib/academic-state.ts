export type AcademicPeriodoState = "planificado" | "activo" | "cerrado";
export type AcademicAsignaturaState = "borrador" | "activo" | "finalizado" | "archivado";

export const periodoPermiteMutaciones = (
  estado: AcademicPeriodoState | null | undefined,
): boolean => estado !== "cerrado";

export const asignaturaPermiteEvaluaciones = (
  estado: AcademicAsignaturaState | null | undefined,
): boolean => estado !== "finalizado" && estado !== "archivado";

export const describeEvaluationWriteLock = (params: {
  periodoEstado?: AcademicPeriodoState | null;
  asignaturaEstado?: AcademicAsignaturaState | null;
}): string | null => {
  if (!periodoPermiteMutaciones(params.periodoEstado)) {
    return "El periodo seleccionado está cerrado. Solo puedes revisar historial y resultados.";
  }

  if (!asignaturaPermiteEvaluaciones(params.asignaturaEstado)) {
    return "La sección está finalizada o archivada. Puedes consultar resultados, pero no crear ni modificar evaluaciones.";
  }

  if (params.periodoEstado === "planificado") {
    return "Este periodo está planificado. Puedes preparar borradores antes de abrirlo al alumnado.";
  }

  if (params.asignaturaEstado === "borrador") {
    return "La sección está en borrador. Puedes dejar evaluaciones preparadas, pero conviene activarla antes de publicarlas.";
  }

  return null;
};
