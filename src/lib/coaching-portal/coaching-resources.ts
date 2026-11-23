import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';

export type CoachingResourceItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
  tag?: string;
};

export type CoachingResourceSection = {
  id: string;
  title: string;
  description: string;
  items: CoachingResourceItem[];
  /** Optional in-page anchor for deep links (e.g. TradeHall preview). */
  anchorId?: string;
};

/** Curated resources for coaching members — implementation help lives under Growth services. */
export const COACHING_RESOURCE_SECTIONS: CoachingResourceSection[] = [
  {
    id: 'learning',
    title: 'CARSI learning',
    description: 'Strengthen technical skills alongside your business plan.',
    items: [
      {
        id: 'catalogue',
        title: 'Course catalogue',
        description: 'Browse restoration and cleaning courses, including IICRC CEC courses.',
        href: '/dashboard/courses',
        tag: 'LMS',
      },
      {
        id: 'my-learning',
        title: 'My Learning',
        description: 'Continue enrolled courses and track progress.',
        href: '/dashboard/student',
        tag: 'LMS',
      },
    ],
  },
  {
    id: 'visibility',
    title: 'Marketing & local visibility',
    description: 'Practical checklists Phill often assigns in month one.',
    items: [
      {
        id: 'gbp-checklist',
        title: 'Google Business Profile checklist',
        description:
          'Categories, service areas, photos, posts, and review rhythm — work through before your first session.',
        href: 'https://support.google.com/business/answer/3038177',
        external: true,
        tag: 'Guide',
      },
      {
        id: 'programme',
        title: 'What’s included in coaching',
        description: 'Marketing, operations, and monthly planning scope for your membership.',
        href: '/ccw-training',
        tag: 'Programme',
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations & money',
    description: 'Templates and habits to discuss with Phill on calls.',
    items: [
      {
        id: 'session-prep',
        title: 'Session prep (portal)',
        description: 'Tell Phill what you want to cover before each monthly call.',
        href: coachingPortalPath('/sessions'),
        tag: 'Workspace',
      },
      {
        id: 'actions',
        title: 'Monthly actions',
        description: 'Track commitments from your coaching plan.',
        href: coachingPortalPath('/actions'),
        tag: 'Workspace',
      },
    ],
  },
  {
    id: 'community',
    title: 'Owner community & TradeHall',
    description:
      'Peer rooms and the in-portal TradeHall seminar replays (Advantage A9).',
    anchorId: 'tradehall',
    items: [
      {
        id: 'owner-circle',
        title: 'Owner Circle',
        description:
          'Monthly after-hours video room with other owners — separate from your 1:1 coaching plan.',
        href: '/programs/owner-circle',
        tag: 'Live',
      },
      {
        id: 'tradehall-preview',
        title: 'TradeHall seminar room',
        description:
          'Chapter replays and supplier briefings in your portal. Live Growth Days and Owner Circle stay your peer touchpoints between sessions.',
        href: coachingPortalPath('/tradehall'),
        tag: 'Preview',
      },
      {
        id: 'partner-demo',
        title: 'Partner demo walkthrough',
        description: 'What a prospect coach sees on a sales call — every workspace screen.',
        href: '/ccw-training/partner-demo',
        tag: 'Sales',
      },
    ],
  },
  {
    id: 'support',
    title: 'Help & implementation',
    description: 'Coaching is strategy and accountability; hands-on builds are quoted separately.',
    items: [
      {
        id: 'growth-services',
        title: 'Growth services',
        description: 'Website, SEO, ads, and automation — request a written quote in the portal.',
        href: coachingPortalPath('/services'),
        tag: 'Add-ons',
      },
      {
        id: 'billing',
        title: 'Billing & subscription',
        description: 'Update payment method or view invoices via Stripe.',
        href: coachingPortalPath('/billing'),
        tag: 'Account',
      },
    ],
  },
];
