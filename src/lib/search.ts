export const buildLikeTerm = (term: string | undefined | null): string | null => {
  if (!term) return null;
  const escaped = term
    .replace(/\\/g, "\\\\") // Escape escapes
    .replace(/%/g, "\\%")  // Escape %
    .replace(/_/g, "\\_"); // Escape _
  return `%${escaped}%`;
};
