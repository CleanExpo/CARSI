/** Query guards for learner journey API (no user-controlled SQL). */
const COURSE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,118}$/;

export function parseFocusCourseSlug(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.length > 120 || !COURSE_SLUG_PATTERN.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

/** Focus is honoured only when the learner has an active enrollment for that catalogue slug. */
export function resolveFocusCourseSlug(
  focus: string | undefined,
  enrolledSlugs: ReadonlySet<string>
): string | undefined {
  if (!focus) return undefined;
  return enrolledSlugs.has(focus) ? focus : undefined;
}