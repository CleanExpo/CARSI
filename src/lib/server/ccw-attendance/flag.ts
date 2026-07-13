/**
 * CCW/CARSI attendance foundation (unit A) — feature flag.
 *
 * Everything in this unit is DARK until an operator explicitly sets
 * `CCW_ATTENDANCE_ENABLED=true` (or `1`) in the environment. New public and
 * admin routes MUST 404/403 when this returns false. Default is OFF.
 *
 * Server-only: reads `process.env` — never import this into client code.
 */
export function isCcwAttendanceEnabled(): boolean {
  const raw = process.env.CCW_ATTENDANCE_ENABLED;
  if (raw == null) return false;
  const value = raw.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}
