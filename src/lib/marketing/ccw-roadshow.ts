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

export const ccwRoadshowTopics = [
  'Carpet cleaning',
  'Rug cleaning',
  'Stain removal',
  'Tile cleaning',
  'Business growth',
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
      'Two practical days connecting training, equipment, service design, chemistry, sales confidence and business growth for carpet, rug, stain and tile cleaning operators.',
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
      'Two practical days connecting training, equipment, service design, chemistry, sales confidence and business growth for carpet, rug, stain and tile cleaning operators.',
  },
];

export const ccwRoadshowTicketPackages: CcwRoadshowTicketPackage[] = [
  {
    id: 'single',
    label: 'Single attendee',
    shortLabel: '$175 per person',
    unitAmountCents: 17500,
    attendeeCount: 1,
    description: 'One seat for the selected two-day CARSI x CCW Business Growth Days event.',
  },
  {
    id: 'team-five',
    label: 'Team pack',
    shortLabel: '$500 for 5',
    unitAmountCents: 50000,
    attendeeCount: 5,
    description: 'Five seats for the selected two-day CARSI x CCW Business Growth Days event.',
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
    title: 'Because growth needs more than another machine or product',
    body:
      'Most cleaning businesses do not stall because owners lack effort. They stall because training, equipment, chemicals, service offers, pricing and customer follow-up are treated as separate decisions. These two days help operators connect the decisions before more money, time or reputation is put at risk.',
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
    title: 'Leave with clearer services, safer decisions and a stronger growth plan',
    body:
      'The outcome is not just inspiration. Attendees should leave with practical next steps they can use in the business: what to learn, what to buy, what to sell, what to charge, what to document and when to ask for help.',
    points: [
      'A clearer map of carpet, rug, stain and tile cleaning service opportunities.',
      'A stronger link between equipment, chemicals, method, safety and customer expectations.',
      'Better confidence to quote, explain value, capture leads and follow up after the job.',
      'A practical training and team-development path through CARSI and hands-on CCW support.',
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
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
