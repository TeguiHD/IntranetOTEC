export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  void buffer;
  void contentType;
  return `${bucket}/${path}`;
}

export async function getPresignedUrl(
  bucket: string,
  path: string,
  expirySecs = 3600,
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");

  return `${baseUrl}/uploads/${bucket}/${encodedPath}?exp=${expirySecs}`;
}

export async function deleteFile(
  bucket: string,
  path: string,
): Promise<void> {
  const fs = await import("node:fs/promises");
  const filePath = `uploads/${bucket}/${path}`;
  await fs.unlink(filePath).catch(() => {});
}

export function getFileStream(
  bucket: string,
  path: string,
): { stream: import("node:fs").ReadStream } | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  const filePath = `uploads/${bucket}/${path}`;

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return { stream: fs.createReadStream(filePath) };
}

export async function getFileSize(
  bucket: string,
  path: string,
): Promise<number | null> {
  const fs = await import("node:fs/promises");
  const filePath = `uploads/${bucket}/${path}`;

  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return null;
  }
}
