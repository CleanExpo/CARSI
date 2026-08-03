/**
 * CCW/CARSI attendee Course Offers — feature flag.
 *
 * The offers surface (welcome-email CTAs, portal panel) is DARK until an
 * operator sets `CCW_ATTENDEE_OFFERS_ENABLED=true` (or 1/yes/on). This is
 * intentionally SEPARATE from `CCW_ATTENDANCE_ENABLED`: attendance provisioning
 * and money offers are different risk surfaces, and the offers depend on
 * external parties (permanent CCW URL, live CARSI price) that may land after
 * attendance is already live. Default is OFF.
 *
 * Server-only: reads `process.env` — never import into client code.
 */
export function isCcwAttendeeOffersEnabled(): boolean {
  const raw = process.env.CCW_ATTENDEE_OFFERS_ENABLED;
  if (raw == null) return false;
  const value = raw.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}
