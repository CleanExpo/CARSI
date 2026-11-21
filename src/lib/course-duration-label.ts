/**
 * The one place a course's duration gets its unit. Returns null when there is no duration,
 * so callers can choose their own fallback (a stat tile says "Own pace"; a summary line omits it).
 */
export function courseDurationLabel(hours: number | string | null | undefined): string | null {
  if (hours === null || hours === undefined || hours === '' || Number(hours) === 0) return null;
  return `${hours}h`;
}
