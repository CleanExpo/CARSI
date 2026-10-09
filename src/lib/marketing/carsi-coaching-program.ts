import { businessCoachingSeatPriceCents } from '@/lib/marketing/business-coaching';
import {
  carsiCoachingMonthlyPriceLabel,
  carsiCoachingProductName,
  formatCoachingAudFromCents,
} from '@/lib/marketing/carsi-coaching-monthly';
import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';

export const carsiCoachingPortalPath = '/coaching';

/** When true, add-on booking stays preview-only (portal is live at {@link carsiCoachingPortalPath}). */
export const carsiCoachingAddOnsComingSoon = true;

/** @deprecated Use {@link carsiCoachingAddOnsComingSoon} — portal is no longer gated by this flag. */
export const carsiCoachingAddOnsAndPortalComingSoon = carsiCoachingAddOnsComingSoon;

export type CoachingInclusion = {
  category: string;
  items: { title: string; detail: string }[];
};

/** Everything included in the $495/month subscription. */
export const carsiCoachingMonthlyInclusions: CoachingInclusion[] = [
  {
    category: 'Strategy & plan',
    items: [
      {
        title: 'Horizontal + direction map',
        detail:
          'Document what you already bring (skills, gear, experience) and where the business is going at 6, 12, and 60 months — updated as you grow.',
      },
      {
        title: 'Living business plan in CARSI',
        detail:
          'Not a static PDF. Goals, milestones, and “built for sale” discipline live in your portal and change each month after your session with Phill.',
      },
      {
        title: 'Monthly “grill” session',
        detail:
          'Minimum one live planning call with Phill per month: honest review of the last month, then a bespoke plan for the next.',
      },
    ],
  },
  {
    category: 'Marketing & visibility',
    items: [
      {
        title: 'Website & positioning review',
        detail:
          'Does your site explain who you are, what you do, and why someone should call you? Action list for fixes, not vague SEO talk.',
      },
      {
        title: 'Google Business Profile & local search',
        detail:
          'Categories, service areas, photos, posts, and reviews — structured so you show up when locals search.',
      },
      {
        title: 'Social that matches the business',
        detail:
          'Profiles set up correctly, content rhythm, and offers that fit pressure washing, cleaning, or restoration — not generic influencer advice.',
      },
      {
        title: 'SEO & AI discoverability',
        detail:
          'Practical steps for traditional search and AI-assisted discovery (e.g. structured content, listings, authority signals) so $800/mo agencies have something real to work with.',
      },
    ],
  },
  {
    category: 'Operations & money',
    items: [
      {
        title: 'Quoting & job costing rhythm',
        detail:
          'Templates and habits so you stop undercharging good work and over-investing in gear before the phone rings.',
      },
      {
        title: 'Cash flow & buyer-ready numbers',
        detail:
          'Simple metrics an owner, bank, or future buyer can understand — tied to your monthly plan.',
      },
    ],
  },
  {
    category: 'Training & AI',
    items: [
      {
        title: 'Curated CARSI learning path',
        detail:
          'Technical and business modules from the catalogue assigned to your gaps (not random course shopping).',
      },
      {
        title: 'AI in your business',
        detail:
          'Prompts and workflows for content, admin, customer comms, and research — with your judgement in the loop.',
      },
    ],
  },
  {
    category: 'Platform',
    items: [
      {
        title: 'Business Coaching Portal (launching soon)',
        detail:
          'Subscriber dashboard for your plan, monthly actions, progress, and session prep — rolling out shortly after the core program is live.',
      },
      {
        title: 'Email onboarding & session scheduling',
        detail:
          'After Stripe checkout you receive confirmation; Phill’s team books your first monthly session and unlocks your portal track.',
      },
    ],
  },
];

export type CoachingAddOn = {
  id: string;
  title: string;
  priceLabel: string;
  billing: 'monthly' | 'one_off' | 'per_seat' | 'from' | 'quarterly';
  description: string;
  href?: string;
  cta?: string;
  includedInBase?: boolean;
};

export const carsiCoachingAddOns: CoachingAddOn[] = [
  {
    id: 'base',
    title: carsiCoachingProductName,
    priceLabel: carsiCoachingMonthlyPriceLabel,
    billing: 'monthly',
    description:
      'Full program above: portal, LMS roadmap, AI guidance, and monthly live session with Phill.',
    includedInBase: true,
    cta: 'Subscribe',
  },
  {
    id: 'partner-portal',
    title: 'Partner portal seat',
    priceLabel: `${formatCoachingAudFromCents(9500)}/month`,
    billing: 'monthly',
    description:
      'Spouse or business partner sees the same plan, actions, and progress in the Business Coaching Portal.',
    cta: 'Request add-on',
  },
  {
    id: 'extra-1to1',
    title: 'Extra 1:1 strategy session',
    priceLabel: formatCoachingAudFromCents(45000),
    billing: 'one_off',
    description:
      '90-minute deep dive between monthly sessions — marketing, numbers, or a major decision.',
    cta: 'Request add-on',
  },
  {
    id: 'owner-circle',
    title: 'Owner Circle group seat',
    priceLabel: `${formatCoachingAudFromCents(businessCoachingSeatPriceCents)}/seat`,
    billing: 'per_seat',
    description:
      'Monthly after-hours room conversation with other owners (separate from your 1:1 coaching plan).',
    href: '/programs/owner-circle',
    cta: 'Book Owner Circle',
  },
  {
    id: 'growth-days',
    title: 'CARSI × CCW Business Growth Days',
    priceLabel: 'From $149',
    billing: 'from',
    description:
      'Two-day intensive with Phill at CCW — in-person business growth (separate ticket).',
    href: `${ccwRoadshowPath}#booking`,
    cta: 'View Growth Days',
  },
  {
    id: 'web-gbp-sprint',
    title: 'Website + GBP done-with-you sprint',
    priceLabel: formatCoachingAudFromCents(185000),
    billing: 'one_off',
    description:
      'Focused implementation block: core pages, GBP cleanup, and handover checklist (for subscribers who want speed).',
    cta: 'Request add-on',
  },
  {
    id: 'quarterly-numbers',
    title: 'Quarterly numbers review pack',
    priceLabel: `${formatCoachingAudFromCents(29500)}/quarter`,
    billing: 'quarterly',
    description:
      'Structured P&L-style review and targets for the next 90 days, aligned to your coaching plan.',
    cta: 'Request add-on',
  },
];

export type PortalFeature = {
  title: string;
  detail: string;
};

/** What subscribers see inside the Business Coaching Portal. */
export const carsiCoachingPortalFeatures: PortalFeature[] = [
  {
    title: 'Your horizontal & direction',
    detail:
      'Editable summary of what you bring today and where the business is headed — the anchor for every month’s plan.',
  },
  {
    title: 'Monthly action board',
    detail:
      'Checklist of this month’s steps (marketing, ops, training) with done / in progress / blocked — set with Phill, executed by you between sessions.',
  },
  {
    title: 'Progress & streaks',
    detail:
      'See completion rate on monthly actions and linked CARSI modules so nothing slips for eight months unnoticed.',
  },
  {
    title: 'Session hub',
    detail:
      'Next session date, video link, and brief prep prompts. Archive of past session outcomes and decisions.',
  },
  {
    title: 'Resource library',
    detail:
      'AI prompt packs, quoting templates, GBP checklists, and links to assigned CARSI courses — scoped to your plan.',
  },
  {
    title: 'Add-ons & upgrades',
    detail:
      'Request partner seats, extra 1:1s, or implementation sprints without leaving the portal (handled by the CARSI team).',
  },
  {
    title: 'Billing & subscription',
    detail:
      'Link to manage your Stripe subscription (payment method, invoices, cancel) once your coaching subscription is active.',
  },
];

export const carsiCoachingAddOnContactEmail = 'support@carsi.com.au';

export function carsiCoachingAddOnMailto(addOnId: string, subject?: string): string {
  const addOn = carsiCoachingAddOns.find((a) => a.id === addOnId);
  const sub = subject ?? `Business Coaching add-on: ${addOn?.title ?? addOnId}`;
  return `mailto:${carsiCoachingAddOnContactEmail}?subject=${encodeURIComponent(sub)}`;
}
