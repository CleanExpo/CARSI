/**
 * Per-city organizer notification routing for CCW Roadshow signups.
 *
 * SERVER-ONLY: kept out of src/lib/marketing/ccw-roadshow.ts because that module
 * is imported by the client booking form (CcwRoadshowBooking.tsx) — recipient
 * addresses (e.g. the CCW contact) must never ship in the client bundle.
 *
 * Defaults can be overridden per city via env (comma-separated address lists):
 *   CCW_ROADSHOW_NOTIFY_MELBOURNE, CCW_ROADSHOW_NOTIFY_SYDNEY
 */

const PHILL = 'phill.mcgurk@gmail.com';
const TOBY = 'tobyb@ccwarehouse.com.au';

const DEFAULT_RECIPIENTS: Record<string, string[]> = {
  // Melbourne is Phill's campaign.
  melbourne: [PHILL],
  // Sydney is Toby/CCW's campaign — notify Toby and copy Phill.
  sydney: [TOBY, PHILL],
};

function parseEnvList(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

/**
 * Resolve who should be emailed when someone registers for a given city event.
 * Env override wins; otherwise the per-city default; unknown slug → empty list
 * (caller treats an empty list as "no organizer notification").
 */
export function getRoadshowNotifyRecipients(slug: string | null | undefined): string[] {
  const normalized = slug?.trim().toLowerCase() ?? '';
  const envKey = `CCW_ROADSHOW_NOTIFY_${normalized.toUpperCase()}`;
  const fromEnv = parseEnvList(process.env[envKey]);
  if (fromEnv) return fromEnv;
  return DEFAULT_RECIPIENTS[normalized] ?? [];
}
