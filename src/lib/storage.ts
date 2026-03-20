import { createReadStream, existsSync } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const UPLOADS_ROOT = resolve(process.cwd(), "uploads");

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const resolveSafePath = (bucket: string, objectPath: string): string => {
  const full = resolve(join(UPLOADS_ROOT, bucket, objectPath));

  if (!full.startsWith(UPLOADS_ROOT)) {
    throw new Error("path_traversal_blocked");
  }

  return full;
};

export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  void contentType;

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("file_too_large");
  }

  const fullPath = resolveSafePath(bucket, path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);

  return `${bucket}/${path}`;
}

export async function deleteFile(
  bucket: string,
  path: string,
): Promise<void> {
  const fullPath = resolveSafePath(bucket, path);

  if (existsSync(fullPath)) {
    await unlink(fullPath);
  }
}

export function getFileStream(
  bucket: string,
  path: string,
): { stream: ReturnType<typeof createReadStream>; fullPath: string } | null {
  const fullPath = resolveSafePath(bucket, path);

  if (!existsSync(fullPath)) {
    return null;
  }

  return { stream: createReadStream(fullPath), fullPath };
}

export async function getFileSize(
  bucket: string,
  path: string,
): Promise<number | null> {
  const fullPath = resolveSafePath(bucket, path);

  if (!existsSync(fullPath)) {
    return null;
  }

  const stats = await stat(fullPath);
  return stats.size;
}
