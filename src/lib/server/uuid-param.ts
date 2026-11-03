/** Strict UUID v1–v5 shape for route params before Prisma (avoids ORM 500 on garbage ids). */
const UUID_PARAM_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidParam(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return UUID_PARAM_RE.test(value.trim());
}
