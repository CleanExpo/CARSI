import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';

export type CoachingHomeMonthSummaryCta = {
  label: string;
  href: string;
  /** Primary is the single best next step this week. */
  variant: 'primary' | 'secondary';
};

export type CoachingHomeMonthSummary = {
  headline: string;
  lines: string[];
  tone: 'neutral' | 'good' | 'attention';
  /** When the member has monthly actions on the board. */
  progress: { completed: number; total: number; percent: number } | null;
  /** One-tap next steps derived from live portal state — no duplicate data entry. */
  ctas: CoachingHomeMonthSummaryCta[];
};

export function buildCoachingHomeMonthSummary(input: {
  completedThisMonth: number;
  totalThisMonth: number;
  proposedFixCount: number;
  marketingHasPack: boolean;
  profileReady: boolean;
  nextActionTitle: string | null;
  /** Pre-formatted due date (e.g. "3 Dec"), formatted by the caller so this stays pure. */
  nextActionDueLabel?: string | null;
}): CoachingHomeMonthSummary {
  const lines: string[] = [];

  if (input.totalThisMonth > 0) {
    const pct = Math.round((input.completedThisMonth / input.totalThisMonth) * 100);
    lines.push(
      `${input.completedThisMonth} of ${input.totalThisMonth} monthly actions complete (${pct}%).`
    );
  } else {
    lines.push(
      'No monthly actions on your board yet — they appear after your growth plan is approved.'
    );
  }

  if (input.proposedFixCount > 0) {
    lines.push(
      `${input.proposedFixCount} marketing fix${input.proposedFixCount === 1 ? '' : 'es'} waiting for coach approval before they become tasks.`
    );
  } else if (input.profileReady && !input.marketingHasPack) {
    lines.push(
      'Build your marketing pack when you are ready — ranked fixes flow here after coach approval.'
    );
  } else if (input.marketingHasPack && input.proposedFixCount === 0) {
    lines.push('Marketing pack is up to date — check actions for coach-approved fixes.');
  }

  if (input.nextActionTitle) {
    // GP-781: the home page hides its "Your next action" card whenever this summary offers an
    // action link, so this line is where the member sees the due date.
    lines.push(
      input.nextActionDueLabel
        ? `Next up: ${input.nextActionTitle} (due ${input.nextActionDueLabel})`
        : `Next up: ${input.nextActionTitle}`
    );
  }

  const attention =
    input.proposedFixCount > 0 ||
    (input.totalThisMonth > 0 && input.completedThisMonth < input.totalThisMonth);
  const good =
    input.totalThisMonth > 0 &&
    input.completedThisMonth === input.totalThisMonth &&
    input.proposedFixCount === 0;

  const progress =
    input.totalThisMonth > 0
      ? {
          completed: input.completedThisMonth,
          total: input.totalThisMonth,
          percent: Math.round((input.completedThisMonth / input.totalThisMonth) * 100),
        }
      : null;

  const actionsHref = coachingPortalPath('/actions');
  const marketingHref = coachingPortalPath('/marketing');
  const sessionsHref = coachingPortalPath('/sessions');

  const ctas: CoachingHomeMonthSummaryCta[] = [];

  if (input.proposedFixCount > 0) {
    ctas.push({
      label: `Review ${input.proposedFixCount} proposed fix${input.proposedFixCount === 1 ? '' : 'es'}`,
      href: actionsHref,
      variant: 'primary',
    });
    ctas.push({ label: 'Marketing pack', href: marketingHref, variant: 'secondary' });
  } else if (input.profileReady && !input.marketingHasPack) {
    ctas.push({ label: 'Build marketing pack', href: marketingHref, variant: 'primary' });
    ctas.push({ label: 'Action board', href: actionsHref, variant: 'secondary' });
  } else if (input.nextActionTitle) {
    ctas.push({ label: 'Open next action', href: actionsHref, variant: 'primary' });
    ctas.push({ label: 'Sessions', href: sessionsHref, variant: 'secondary' });
  } else if (good && input.marketingHasPack) {
    ctas.push({ label: 'View action board', href: actionsHref, variant: 'primary' });
    ctas.push({ label: 'Marketing pack', href: marketingHref, variant: 'secondary' });
  } else {
    ctas.push({ label: 'Action board', href: actionsHref, variant: 'primary' });
    if (input.profileReady) {
      ctas.push({ label: 'Marketing pack', href: marketingHref, variant: 'secondary' });
    }
  }

  return {
    headline: 'This month at a glance',
    lines,
    tone: good ? 'good' : attention ? 'attention' : 'neutral',
    progress,
    ctas,
  };
}