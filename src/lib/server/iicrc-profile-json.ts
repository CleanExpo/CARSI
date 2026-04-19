export function parseIicrcCertifications(
  raw: unknown
): Array<{ discipline: string; certified_at: string }> | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  const out: Array<{ discipline: string; certified_at: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const d = typeof o.discipline === 'string' ? o.discipline : null;
    const ca = typeof o.certified_at === 'string' ? o.certified_at : null;
    if (d && ca) out.push({ discipline: d, certified_at: ca });
  }
  return out.length ? out : null;
}
