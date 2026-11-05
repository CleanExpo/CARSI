/** Copy and support hints for each coaching workspace route (member-facing). */
export type CoachingPageMeta = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  supportSubject: string;
  supportTips: string[];
};

export const COACHING_PAGE_META = {
  home: {
    id: 'home',
    eyebrow: 'Workspace',
    title: 'Business Coaching',
    description: 'Your plan, actions, sessions and marketing tools in one place.',
    supportSubject: 'Business Coaching — workspace help',
    supportTips: ['Tell us which screen confused you and what you expected to see.'],
  },
  plan: {
    id: 'plan',
    eyebrow: 'Direction',
    title: 'My plan',
    description: 'Your direction, goals, and focus — updated with your coach each month.',
    supportSubject: 'Business Coaching — growth plan help',
    supportTips: [
      'If your approved focus is missing, your assessment may still be in review.',
      'Save direction notes anytime; your coach sees updates before the next session.',
    ],
  },
  actions: {
    id: 'actions',
    eyebrow: 'Commitments',
    title: 'Actions',
    description: 'Steps for this month — agreed with your coach, executed by you.',
    supportSubject: 'Business Coaching — action board help',
    supportTips: [
      'Marketing-pack fixes show as waiting for coach until approved.',
      'Learning actions track course progress automatically from the LMS.',
    ],
  },
  sessions: {
    id: 'sessions',
    eyebrow: 'Consultations',
    title: 'Sessions',
    description: 'Prep notes, join links, and receipts from every coaching call.',
    supportSubject: 'Business Coaching — sessions help',
    supportTips: [
      'Use the booking link if no upcoming session appears.',
      'Add prep notes on the plan page before you join.',
    ],
  },
  resources: {
    id: 'resources',
    eyebrow: 'Library',
    title: 'Resources',
    description: 'Learning paths, checklists, and links curated for coaching members.',
    supportSubject: 'Business Coaching — resources help',
    supportTips: ['Prescribed courses appear after your coach approves your learning path.'],
  },
  billing: {
    id: 'billing',
    eyebrow: 'Membership',
    title: 'Billing',
    description: 'Monthly coaching subscription via Stripe — separate from course purchases.',
    supportSubject: 'Business Coaching — billing help',
    supportTips: ['Use the Stripe portal for invoices; email us if a charge looks wrong.'],
  },
  services: {
    id: 'services',
    eyebrow: 'Implementation',
    title: 'Growth services',
    description: 'Quoted website, SEO and implementation work — invoiced separately from coaching.',
    supportSubject: 'Business Coaching — growth services quote',
    supportTips: ['Pick a service and send a quote request; Phill responds with scope and price.'],
  },
  progress: {
    id: 'progress',
    eyebrow: 'Accountability',
    title: 'Progress',
    description: 'Check-ins and quiet streaks — stay visible between sessions.',
    supportSubject: 'Business Coaching — progress check-ins',
    supportTips: ['Progress tracking respects your subscription and feature flags.'],
  },
  marketing: {
    id: 'marketing',
    eyebrow: 'Advantage A7',
    title: 'Marketing pack',
    description: 'Website review, checklist and social drafts with coach-approved fixes.',
    supportSubject: 'Business Coaching — marketing pack help',
    supportTips: [
      'Wait ten minutes between rebuilds.',
      'Email us if your site blocks our checker.',
    ],
  },
} as const satisfies Record<string, CoachingPageMeta>;

export type CoachingPageMetaKey = keyof typeof COACHING_PAGE_META;
