/** RFC 5987 `filename*` plus a conservative ASCII fallback for attachment downloads. */
export function attachmentContentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
