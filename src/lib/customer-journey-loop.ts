import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  Compass,
  GraduationCap,
  RefreshCw,
  Route,
  ShieldCheck,
  Users,
} from 'lucide-react';

export type JourneyLoopStage = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const customerJourneyLoopStages: JourneyLoopStage[] = [
  {
    id: 'discover',
    title: 'Discover',
    description: 'Name the learner goal, trade problem, team need, or CEC deadline.',
    icon: Compass,
  },
  {
    id: 'choose',
    title: 'Choose',
    description: 'Recommend the shortest credible course or pathway.',
    icon: Route,
  },
  {
    id: 'enrol',
    title: 'Enrol',
    description: 'Make individual and team access clear before checkout.',
    icon: ClipboardCheck,
  },
  {
    id: 'start',
    title: 'Start',
    description: 'Push the learner straight to the first useful lesson.',
    icon: BookOpenCheck,
  },
  {
    id: 'return',
    title: 'Return',
    description: 'Use reminders, resume links, and progress cues to pull them back.',
    icon: RefreshCw,
  },
  {
    id: 'credential',
    title: 'Credential',
    description: 'Issue verifiable certificates and CEC evidence when complete.',
    icon: Award,
  },
  {
    id: 'next',
    title: 'Next',
    description: 'Recommend the next course, team rollout, or renewal action.',
    icon: BadgeCheck,
  },
];

export type PathwayAdvisorOption = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
  bestFor: string[];
  recommendedDisciplines: string[];
  firstAction: string;
  retentionCue: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  icon: LucideIcon;
};

export const pathwayAdvisorOptions: PathwayAdvisorOption[] = [
  {
    id: 'new-operator',
    label: 'New operator',
    eyebrow: 'Start here',
    title: 'Build the carpet cleaning baseline first',
    summary:
      'For starters, side-hustle operators, and cleaners adding carpet cleaning who need language, risk awareness, quoting confidence, and a practical first training path.',
    bestFor: [
      'No-experience starters',
      'Cleaners adding carpet cleaning',
      'Business buyers doing due diligence',
    ],
    recommendedDisciplines: ['CCT', 'WRT', 'OCT'],
    firstAction:
      'Read the Start Smart guide, then enrol in the first carpet cleaning or water-risk course.',
    retentionCue:
      'Send a day-3 reminder to complete the first lesson and choose a first service niche.',
    primaryHref: '/start-carpet-cleaning-business',
    primaryLabel: 'Start Smart guide',
    secondaryHref: '/courses?discipline=CCT',
    secondaryLabel: 'Browse carpet courses',
    icon: GraduationCap,
  },
  {
    id: 'cec-renewal',
    label: 'CEC renewal',
    eyebrow: 'Fastest path',
    title: 'Earn CECs with the shortest relevant course',
    summary:
      'For certified technicians who already know the trade and need a clean route to continuing education, proof, and renewal evidence.',
    bestFor: [
      'IICRC-certified technicians',
      'Busy restoration staff',
      'Learners with an expiry date',
    ],
    recommendedDisciplines: ['WRT', 'ASD', 'AMRT', 'FSRT', 'OCT', 'RRT', 'CCT'],
    firstAction:
      'Pick a discipline, enrol, complete the required modules, then download certificate evidence.',
    retentionCue:
      'Use progress nudges at 25%, 50%, and 80%, then send completion/certificate prompts.',
    primaryHref: '/courses',
    primaryLabel: 'Find CEC courses',
    secondaryHref: '/pricing',
    secondaryLabel: 'View access options',
    icon: Award,
  },
  {
    id: 'water-restoration',
    label: 'Water damage',
    eyebrow: 'Restoration path',
    title: 'Move from water response into drying competence',
    summary:
      'For technicians and companies handling leaks, floods, wet building materials, drying decisions, and insurer-facing documentation.',
    bestFor: ['Restoration technicians', 'Property maintenance teams', 'Insurance repair networks'],
    recommendedDisciplines: ['WRT', 'ASD', 'AMRT'],
    firstAction:
      'Start with WRT fundamentals, then add structural drying and microbial risk awareness.',
    retentionCue:
      'Recommend ASD or microbial remediation content immediately after WRT completion.',
    primaryHref: '/courses?discipline=WRT',
    primaryLabel: 'Browse WRT courses',
    secondaryHref: '/courses?discipline=ASD',
    secondaryLabel: 'Add drying courses',
    icon: ShieldCheck,
  },
  {
    id: 'team-owner',
    label: 'Team owner',
    eyebrow: 'Team rollout',
    title: 'Give the team one operating language',
    summary:
      'For owners and managers who need seat access, staff assignment, shared standards, progress visibility, and fewer knowledge gaps on jobs.',
    bestFor: ['Restoration companies', 'Commercial cleaning teams', 'Multi-site operators'],
    recommendedDisciplines: ['WRT', 'CCT', 'OCT', 'AMRT'],
    firstAction: 'Choose team access, assign the first course, and review progress weekly.',
    retentionCue:
      'Send owner summaries showing seats used, course starts, completions, and stalled learners.',
    primaryHref: '/pricing',
    primaryLabel: 'Compare team access',
    secondaryHref: '/contact?subject=team-training-pathway',
    secondaryLabel: 'Ask about team rollout',
    icon: Users,
  },
  {
    id: 'facility-risk',
    label: 'Facility risk',
    eyebrow: 'Industry teams',
    title: 'Train maintenance teams before a site incident',
    summary:
      'For healthcare, hospitality, education, aged care, logistics, and facility teams facing water, mould, odour, carpet, or downtime risk.',
    bestFor: ['Facility managers', 'Hotel and healthcare teams', 'Education and logistics sites'],
    recommendedDisciplines: ['WRT', 'AMRT', 'OCT', 'RRT'],
    firstAction:
      'Choose the industry risk, then enrol the team in the matching first-response course set.',
    retentionCue:
      'After first completion, prompt managers to assign the same baseline to remaining staff.',
    primaryHref: '/industries',
    primaryLabel: 'Explore industries',
    secondaryHref: '/courses?discipline=WRT',
    secondaryLabel: 'Start with WRT',
    icon: Building2,
  },
];
