import validator from "validator";

export const sanitizePath = (value: string): string => {
  const decoded = decodeURIComponent(value);

  if (!decoded || decoded.length > 1024) {
    throw new Error("Invalid path");
  }

  if (
    decoded.includes("..") ||
    decoded.includes("\\") ||
    decoded.includes("\0")
  ) {
    throw new Error("Invalid path");
  }

  const clean = decoded
    .replace(/[^a-zA-Z0-9/_.-]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");

  if (!clean || clean.includes("..")) {
    throw new Error("Invalid path");
  }

  return clean;
};

const ALLOWED_VIDEO = [
  "youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
  "vimeo.com",
  "drive.google.com",
];

export const sanitizeVideoUrl = (url: string): boolean => {
  if (!validator.isURL(url, { require_protocol: true })) {
    return false;
  }

  const { hostname, protocol } = new URL(url);

  if (protocol !== "https:") {
    return false;
  }

  const normalized = hostname.toLowerCase();

  return ALLOWED_VIDEO.some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`),
  );
};
