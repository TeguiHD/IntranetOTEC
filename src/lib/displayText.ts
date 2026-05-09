const REPLACEMENTS: Array<[RegExp, string]> = [
  [/S\?bado/g, "Sábado"],
  [/s\?bado/g, "sábado"],
  [/Mi\?rcoles/g, "Miércoles"],
  [/mi\?rcoles/g, "miércoles"],
  [/Miercoles/g, "Miércoles"],
  [/miercoles/g, "miércoles"],
  [/Sabado/g, "Sábado"],
  [/sabado/g, "sábado"],
  [/academica/g, "académica"],
  [/Academica/g, "Académica"],
  [/academico/g, "académico"],
  [/Academico/g, "Académico"],
];

export function normalizarTextoVisible(value: string | null | undefined): string {
  if (!value) return "";

  return REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}
