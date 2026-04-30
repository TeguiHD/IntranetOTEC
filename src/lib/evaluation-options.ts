export const stripCorrectAnswer = (options: unknown): unknown => {
  if (!options || typeof options !== "object" || Array.isArray(options)) return options;

  const rawOptions = options as { opciones?: unknown };
  if (!Array.isArray(rawOptions.opciones)) return null;

  return {
    ...Object.fromEntries(
      Object.entries(options).filter(([key]) => key !== "correcta"),
    ),
    opciones: rawOptions.opciones,
  };
};
