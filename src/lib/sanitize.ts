import { sanitizePath, sanitizeVideoUrl } from "@/lib/sanitizePath";

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;
const DANGEROUS_HTML_CHARS_REGEX = /[<>]/g;

export const sanitizeText = (value: string): string =>
  value
    .replace(CONTROL_CHARS_REGEX, " ")
    .replace(DANGEROUS_HTML_CHARS_REGEX, "")
    .trim();

export { sanitizePath, sanitizeVideoUrl };
