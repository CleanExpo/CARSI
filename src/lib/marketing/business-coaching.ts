import {
  computeAvailability,
  decideRegistrationStatus,
  formatAudFromCents,
  type RegistrationStatus,
} from '@/lib/marketing/ccw-roadshow';

export { computeAvailability, decideRegistrationStatus, formatAudFromCents };
export type { RegistrationStatus };

/** Per-seat price (founder decision Oct 2026 — small-business owners). */
export const businessCoachingSeatPriceCents = 2200;

/** Public URL — “Owner Circle”, not the $495 CCW Growth Days product. */
export const businessCoachingPath = '/programs/owner-circle';

export const businessCoachingProductName = 'CARSI Owner Circle';

export const businessCoachingTagline =
  'Monthly after-hours group sessions for small cleaning and restoration business owners — practical business development, not high-ticket coaching.';

export type BusinessCoachingSession = {
  slug: string;
  monthLabel: string;
  title: string;
  dateLabel: string;
  startDateIso: string;
  timeLabel: string;
  venueName: string;
  venueAddress: string;
  city: string;
  description: string;
  capacity: number;
};

export type BusinessCoachingPackage = {
  id: 'owner' | 'owner-partner';
  label: string;
  shortLabel: string;
  attendeeCount: number;
  description: string;
};

export const businessCoachingPackages: BusinessCoachingPackage[] = [
  {
    id: 'owner',
    label: 'Owner seat',
    shortLabel: 'Just me',
    attendeeCount: 1,
    description: 'One seat for you — join the group discussion and business-building session.',
  },
  {
    id: 'owner-partner',
    label: 'Owner + partner',
    shortLabel: 'Bring your partner',
    attendeeCount: 2,
    description:
      'Two seats at $22 each — bring your business partner or spouse so you hear the same conversation.',
  },
];

/**
 * Upcoming monthly sessions. Edit slugs/dates here when Phill locks the calendar.
 * Past sessions are filtered out on the public page automatically.
 */
export const businessCoachingSessions: BusinessCoachingSession[] = [
  {
    slug: '2026-11',
    monthLabel: 'November 2026',
    title: `${businessCoachingProductName} — November 2026`,
    dateLabel: 'Wednesday 12 November 2026',
    startDateIso: '2026-11-12T18:30:00+11:00',
    timeLabel: '6:30pm–8:30pm (after hours)',
    venueName: 'Venue confirmed in your booking email',
    venueAddress: 'Melbourne metro — details sent after payment',
    city: 'Melbourne',
    description:
      'A relaxed, after-hours room conversation: quoting, cash flow, hiring, stories from the floor, and what is working for owners like you.',
    capacity: 28,
  },
  {
    slug: '2026-12',
    monthLabel: 'December 2026',
    title: `${businessCoachingProductName} — December 2026`,
    dateLabel: 'Wednesday 10 December 2026',
    startDateIso: '2026-12-10T18:30:00+11:00',
    timeLabel: '6:30pm–8:30pm (after hours)',
    venueName: 'Venue confirmed in your booking email',
    venueAddress: 'Melbourne metro — details sent after payment',
    city: 'Melbourne',
    description:
      'End-of-year check-in: finish strong, plan January jobs, and learn from other owners without a $495 classroom price tag.',
    capacity: 28,
  },
  {
    slug: '2027-01',
    monthLabel: 'January 2027',
    title: `${businessCoachingProductName} — January 2027`,
    dateLabel: 'Wednesday 14 January 2027',
    startDateIso: '2027-01-14T18:30:00+11:00',
    timeLabel: '6:30pm–8:30pm (after hours)',
    venueName: 'Venue confirmed in your booking email',
    venueAddress: 'Melbourne metro — details sent after payment',
    city: 'Melbourne',
    description:
      'New-year planning for owner-operators: targets, marketing that fits a small budget, and honest talk about gear vs profit.',
    capacity: 28,
  },
];

export function getBusinessCoachingSession(slug: string | null | undefined) {
  const normalized = slug?.trim().toLowerCase();
  return businessCoachingSessions.find((s) => s.slug === normalized) ?? null;
}

export function getBusinessCoachingPackage(id: string | null | undefined) {
  const normalized = id?.trim().toLowerCase();
  return businessCoachingPackages.find((p) => p.id === normalized) ?? null;
}

export function listBookableBusinessCoachingSessions(now = new Date()): BusinessCoachingSession[] {
  return businessCoachingSessions.filter((s) => {
    const start = new Date(s.startDateIso);
    return !Number.isNaN(start.getTime()) && start.getTime() > now.getTime() - 6 * 60 * 60 * 1000;
  });
}

export function resolveInitialSessionSlug(
  rawParam: string | null | undefined,
  sessions: readonly { slug: string }[]
): string {
  const normalized = rawParam?.trim().toLowerCase();
  const match = sessions.find((s) => s.slug === normalized);
  return match?.slug ?? sessions[0]?.slug ?? '';
}

export function packageTotalCents(packageId: BusinessCoachingPackage['id']): number {
  const pkg = getBusinessCoachingPackage(packageId);
  if (!pkg) return businessCoachingSeatPriceCents;
  return businessCoachingSeatPriceCents * pkg.attendeeCount;
}
