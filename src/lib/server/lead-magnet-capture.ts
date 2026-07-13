/**
 * Pure, dependency-free helpers for the GP-199 government-contractor lead magnet.
 * Kept free of Prisma/Next imports so the capture logic is unit-testable in
 * isolation (CARSI convention: logic in src/lib/server/*, route stays thin).
 */

/** Public path to the committed lead-magnet PDF (served directly from public/). */
export const GOV_GUIDE_DOWNLOAD_PATH = '/downloads/carsi-government-contractor-guide.pdf';

/** Human title of the guide — used in landing copy, email subject and body. */
export const GOV_GUIDE_TITLE = 'How to Get on Government Restoration Panels';

/** `ContactSubmission.status` tag that marks a GP-199 lead (queryable in admin). */
export const GOV_GUIDE_LEAD_STATUS = 'gp199_gov_guide';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when `value` is a syntactically valid email address. */
export function isValidLeadEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value.trim().toLowerCase());
}

/** Lower-cased, trimmed email for storage + de-dup. */
export function normaliseLeadEmail(value: string): string {
  return value.trim().toLowerCase();
}

export interface LeadContext {
  source?: string;
  topic?: string;
  intent?: string;
  pageUrl?: string;
}

function clean(value: unknown, max: number): string | undefined {
  return typeof value === 'string'
    ? value.replace(/[<>]/g, '').trim().slice(0, max) || undefined
    : undefined;
}

/** Strip HTML-unsafe chars and cap lengths on attribution fields. */
export function sanitiseLeadContext(ctx: LeadContext | undefined): LeadContext {
  return {
    source: clean(ctx?.source, 48),
    topic: clean(ctx?.topic, 160),
    intent: clean(ctx?.intent, 80),
    pageUrl: clean(ctx?.pageUrl, 240),
  };
}

/**
 * Build the `ContactSubmission.message` body recording what the lead requested
 * and where they came from — the same lead-attribution convention the contact
 * pipeline uses.
 */
export function buildGovGuideLeadMessage(ctx: LeadContext): string {
  return [
    `Lead magnet: ${GOV_GUIDE_TITLE} (GP-199)`,
    ctx.source ? `Lead source: ${ctx.source}` : null,
    ctx.topic ? `Lead topic: ${ctx.topic}` : null,
    ctx.intent ? `Lead intent: ${ctx.intent}` : null,
    ctx.pageUrl ? `Source page: ${ctx.pageUrl}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}
