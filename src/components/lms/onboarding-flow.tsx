import {
  Building2,
  HardHat,
  HeartPulse,
  LandPlot,
  Wrench,
  Users,
  Briefcase,
  Sprout,
  GraduationCap,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { ONBOARDING_GOAL_OPTIONS, type OnboardingGoalValue } from '@/lib/onboarding/goal-options';

/**
 * The first-session onboarding wizard's steps, as data.
 *
 * Kept outside OnboardingWizard.tsx so a unit test can import the exact labels the wizard
 * renders (src/lib/server/onboarding-pathway.test.ts). Licence (CLAUDE.md "CARSI designation
 * rule"): the goal step and the recommendation copy never carry an IICRC designation title or
 * acronym and make no certification claim. The disciplines step asks about the learner's OWN
 * IICRC standing, which is the one place acronyms are legitimately shown.
 */

export interface AnswerCard {
  value: string;
  label: string;
  icon: React.ReactNode;
}

export type FlowItem =
  | {
      kind: 'single';
      question: string;
      key: 'industry' | 'role' | 'iicrc_experience' | 'primary_goal';
      answers: AnswerCard[];
    }
  | {
      kind: 'multi';
      question: string;
      key: 'disciplines_held';
      options: { value: string; label: string }[];
    }
  | { kind: 'renewal'; question: string };

export const GOAL_ICONS: Record<OnboardingGoalValue, React.ReactNode> = {
  new_cert: <GraduationCap className="h-6 w-6" />,
  cec_renewal: <RefreshCw className="h-6 w-6" />,
  career_change: <TrendingUp className="h-6 w-6" />,
};

export const ONBOARDING_FLOW: FlowItem[] = [
  {
    kind: 'single',
    question: "What's your industry?",
    key: 'industry',
    answers: [
      {
        value: 'restoration',
        label: 'Restoration & Remediation',
        icon: <Building2 className="h-6 w-6" />,
      },
      {
        value: 'construction',
        label: 'Construction & Trades',
        icon: <HardHat className="h-6 w-6" />,
      },
      { value: 'healthcare', label: 'Healthcare', icon: <HeartPulse className="h-6 w-6" /> },
      {
        value: 'government',
        label: 'Government & Defence',
        icon: <LandPlot className="h-6 w-6" />,
      },
    ],
  },
  {
    kind: 'single',
    question: "What's your role?",
    key: 'role',
    answers: [
      { value: 'technician', label: 'Field Technician', icon: <Wrench className="h-6 w-6" /> },
      {
        value: 'supervisor',
        label: 'Supervisor / Team Leader',
        icon: <Users className="h-6 w-6" />,
      },
      { value: 'owner', label: 'Business Owner', icon: <Briefcase className="h-6 w-6" /> },
      {
        value: 'new_to_industry',
        label: 'New to the Industry',
        icon: <Sprout className="h-6 w-6" />,
      },
    ],
  },
  {
    kind: 'single',
    question: 'IICRC experience?',
    key: 'iicrc_experience',
    answers: [
      {
        value: 'none',
        label: 'No certifications yet',
        icon: <GraduationCap className="h-6 w-6" />,
      },
      { value: 'some', label: 'Some training / exposure', icon: <RefreshCw className="h-6 w-6" /> },
      {
        value: 'certified',
        label: 'Already IICRC certified',
        icon: <TrendingUp className="h-6 w-6" />,
      },
    ],
  },
  {
    kind: 'multi',
    question: 'Which IICRC disciplines do you hold or plan to work in? Select all that apply.',
    key: 'disciplines_held',
    options: [
      { value: 'WRT', label: 'WRT — Water' },
      { value: 'CRT', label: 'CRT — Carpet' },
      { value: 'ASD', label: 'ASD — Structural drying' },
      { value: 'AMRT', label: 'AMRT — Microbial' },
      { value: 'FSRT', label: 'FSRT — Fire & smoke' },
      { value: 'OCT', label: 'OCT — Odour' },
      { value: 'CCT', label: 'CCT — Carpet cleaning' },
    ],
  },
  {
    kind: 'single',
    question: "What's your main goal?",
    key: 'primary_goal',
    // Labels live in src/lib/onboarding/goal-options.ts (licence-pinned by test); only icons here.
    answers: ONBOARDING_GOAL_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
      icon: GOAL_ICONS[option.value],
    })),
  },
  {
    kind: 'renewal',
    question: 'Renewal & reminders (optional)',
  },
];

/** The labels the wizard renders on its goal step, exactly as it renders them. */
export function wizardGoalLabels(): string[] {
  const step = ONBOARDING_FLOW.find((item) => item.kind === 'single' && item.key === 'primary_goal');
  return step && step.kind === 'single' ? step.answers.map((answer) => answer.label) : [];
}
