export const COACH_FEEDBACK_MAX_CHARS = 2000;

export function normalizeCoachFeedback(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, COACH_FEEDBACK_MAX_CHARS);
}
