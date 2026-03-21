/**
 * Shared search utilities.
 * Security #49: escape SQL LIKE wildcards (% and _) in user input.
 * Bug #42: shared getStringField utility.
 * Bug #43: shared sanitizeOptionalText utility.
 */

import { sanitizeText } from "@/lib/sanitize";

/** Escape SQL LIKE wildcards so user-provided % or _ are treated as literals. */
export const escapeLikeWildcards = (value: string): string =>
  value.replace(/[%_\\]/g, (char) => `\\${char}`);

/** Build a safe LIKE term: %escaped_query% */
export const buildLikeTerm = (query: string): string =>
  `%${escapeLikeWildcards(query)}%`;

/** Extract a string field from FormData (shared helper, replaces 6+ copies). */
export const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

/** Sanitize optional text, collapse whitespace, return undefined if empty. */
export const sanitizeOptionalText = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const clean = sanitizeText(value).replace(/\s+/g, " ").trim();
  return clean.length > 0 ? clean : undefined;
};
