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
