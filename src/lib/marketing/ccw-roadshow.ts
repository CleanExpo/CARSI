export type CcwRoadshowEvent = {
  slug: string;
  city: 'Melbourne' | 'Sydney';
  title: string;
  dates: string;
  dateRangeLabel: string;
  startDateIso: string;
  endDateIso: string;
  timeLabel: string;
  venueName: string;
  streetAddress: string;
  suburb: string;
  suburbStatePostcode: string;
  state: 'VIC' | 'NSW';
  description: string;
  capacity: number;
  calendarEventId: string;
};

export type CcwRoadshowTicketPackage = {
  id: 'single' | 'team-five';
  label: string;
  shortLabel: string;
  unitAmountCents: number;
  attendeeCount: number;
  description: string;
};

export const ccwRoadshowPath = '/events/ccw-roadshow';

export const ccwRoadshowTitle = 'CARSI x CCW Business Growth Days';

export const ccwRoadshowHeroHeadline = 'Grow Your Cleaning Business';

export const ccwRoadshowFreeEntryOffer = {
  headline: 'Free for CCW past and current customers',
  detail:
    'All past and current Carpet Cleaners Warehouse customers can attend at no cost. Register to claim a free entry token for check-in at the CCW location.',
  tokenPrefix: 'CCW-FREE',
};

export const ccwRoadshowPresenter = {
  name: 'Phill McGurk',
  role: 'CARSI founder and cleaning and restoration educator',
  value:
    'Spend two practical days learning directly from Phill McGurk and the CCW team, with the conversation tied back to real equipment, chemicals, service decisions and customer outcomes.',
};

export const ccwRoadshowTopics = [
  'Better-fit jobs',
  'Quote with confidence',
  'Improve profit decisions',
  'Avoid costly mistakes',
  'Add profitable services',
  'Build a stronger business',
];

export const ccwRoadshowFacilityAdvantages = [
  'See equipment and chemical options inside working Carpet Cleaners Warehouse locations.',
  'Compare practical solutions side-by-side before spending more money.',
  'Ask real-world questions that connect training directly to customer jobs.',
  'Link the course material to service offers, quoting, safety and follow-up.',
];

export const ccwRoadshowEvents: CcwRoadshowEvent[] = [
  {
    slug: 'melbourne',
    city: 'Melbourne',
    title: `${ccwRoadshowTitle} - Melbourne`,
    dates: '22-23 July 2026',
    dateRangeLabel: 'Wednesday 22 July - Thursday 23 July 2026',
    startDateIso: '2026-07-22T08:30:00+10:00',
    endDateIso: '2026-07-23T16:30:00+10:00',
    timeLabel: '8.30am-4.30pm both days',
    venueName: 'Carpet Cleaners Warehouse Melbourne',
    streetAddress: 'Unit 1/5 Gatwick Road',
    suburb: 'Bayswater North',
    suburbStatePostcode: 'Bayswater North VIC 3153',
    state: 'VIC',
    description:
      'Two practical days with Phill McGurk and the CCW team, connecting training, equipment, service design, chemistry, quoting confidence and business growth for carpet, rug, stain and tile cleaning operators.',
    capacity: 10,
    calendarEventId: '1d1uqjm6an36n1kgc6s4s3ln7s',
  },
  {
    slug: 'sydney',
    city: 'Sydney',
    title: `${ccwRoadshowTitle} - Sydney`,
    dates: '30-31 July 2026',
    dateRangeLabel: 'Thursday 30 July - Friday 31 July 2026',
    startDateIso: '2026-07-30T08:30:00+10:00',
    endDateIso: '2026-07-31T16:30:00+10:00',
    timeLabel: '8.30am-4.30pm both days',
    venueName: 'Carpet Cleaners Warehouse Sydney',
    streetAddress: '2/8 Tollis Place',
    suburb: 'Seven Hills',
    suburbStatePostcode: 'Seven Hills NSW 2147',
    state: 'NSW',
    description:
      'Two practical days with Phill McGurk and the CCW team, connecting training, equipment, service design, chemistry, quoting confidence and business growth for carpet, rug, stain and tile cleaning operators.',
    capacity: 12,
    calendarEventId: 'h6qm8t3muuv44ht9gqann5dhuk',
  },
];

export const ccwRoadshowTicketPackages: CcwRoadshowTicketPackage[] = [
  {
    id: 'single',
    label: 'Free CCW customer entry',
    shortLabel: 'Free entry',
    unitAmountCents: 0,
    attendeeCount: 1,
    description:
      'One free seat for a past or current CCW customer at the selected two-day CARSI x CCW Business Growth Days event.',
  },
  {
    id: 'team-five',
    label: 'Free CCW team entry',
    shortLabel: 'Free for 5',
    unitAmountCents: 0,
    attendeeCount: 5,
    description:
      'Five free seats for a past or current CCW customer team at the selected two-day CARSI x CCW Business Growth Days event.',
  },
];

export const ccwRoadshowAudienceSegments = [
  'Owner-operators who want better technical confidence and stronger service offers',
  'Cleaners adding carpet, rug, stain or tile cleaning to an existing business',
  'Teams comparing equipment, chemicals, service standards and training before investing',
  'Business buyers or managers wanting a practical growth and risk-readiness checkpoint',
];

export const ccwRoadshowCampaignPillars = {
  why: {
    eyebrow: 'Why attend',
    title: 'Because this is business improvement, not just a product day',
    body:
      'Most cleaning businesses do not stall because owners lack effort. They stall because training, equipment, chemicals, service offers, pricing and customer follow-up are treated as separate decisions. These two days help operators connect those decisions before more money, time or reputation is put at risk.',
    points: [
      'Turn scattered supplier, product and course information into a practical business direction.',
      'Understand how service promises, equipment choices and chemical decisions affect customer outcomes.',
      'Use training as the decision layer before quoting harder jobs, adding services or scaling a team.',
    ],
  },
  who: {
    eyebrow: 'Who it is for',
    title: 'For cleaners, operators and teams ready to make better decisions',
    body:
      'The campaign should speak to people who are already close to action: starting up, adding a service, buying equipment, training staff, or trying to lift the value of the work they already sell.',
    points: ccwRoadshowAudienceSegments,
  },
  achieve: {
    eyebrow: 'What you will achieve',
    title: 'Leave with strategies you can use immediately',
    body:
      'The outcome is not just inspiration. Attendees receive the course outline and chemical decision details as part of the course material, then leave with practical next steps they can use in the business: what to learn, what to buy, what to sell, what to charge, what to document and when to ask for help.',
    points: [
      'Win better-fit jobs by knowing which services, methods and customer promises fit your capability.',
      'Quote with more confidence and explain value without overpromising.',
      'Avoid costly mistakes with equipment, chemicals, method selection and process decisions.',
      'Add profitable services with a clearer path for carpet, rug, stain and tile work.',
      'Build a stronger business through better systems, team language, lead capture and follow-up.',
    ],
  },
} as const;

export function getCcwRoadshowEvent(slug: string | null | undefined) {
  const normalized = slug?.trim().toLowerCase();
  return ccwRoadshowEvents.find((event) => event.slug === normalized) ?? null;
}

export function getCcwRoadshowTicketPackage(id: string | null | undefined) {
  const normalized = id?.trim().toLowerCase();
  return ccwRoadshowTicketPackages.find((pkg) => pkg.id === normalized) ?? null;
}

export function formatAudFromCents(cents: number) {
  if (cents <= 0) return 'Free';

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export type RegistrationStatus = 'confirmed' | 'waitlisted';

export const ccwRoadshowExperienceBands: { value: string; label: string }[] = [
  { value: '0-1', label: '0–1 years' },
  { value: '2-5', label: '2–5 years' },
  { value: '6-10', label: '6–10 years' },
  { value: '11+', label: '11+ years' },
];

export function isValidExperienceBand(value: string): boolean {
  return ccwRoadshowExperienceBands.some((band) => band.value === value);
}

export function decideRegistrationStatus(input: {
  confirmedSeats: number;
  requestedSeats: number;
  capacity: number;
}): { status: RegistrationStatus } {
  const fits = input.confirmedSeats + input.requestedSeats <= input.capacity;
  return { status: fits ? 'confirmed' : 'waitlisted' };
}

export function computeAvailability(input: {
  capacity: number;
  confirmedSeats: number;
}): { capacity: number; confirmed: number; remaining: number; isFull: boolean } {
  const remaining = Math.max(0, input.capacity - input.confirmedSeats);
  return {
    capacity: input.capacity,
    confirmed: input.confirmedSeats,
    remaining,
    isFull: input.confirmedSeats >= input.capacity,
  };
}
