export type CoachingHomeMonthSummary = {
  headline: string;
  lines: string[];
  tone: 'neutral' | 'good' | 'attention';
};

export function buildCoachingHomeMonthSummary(input: {
  completedThisMonth: number;
  totalThisMonth: number;
  proposedFixCount: number;
  marketingHasPack: boolean;
  profileReady: boolean;
  nextActionTitle: string | null;
}): CoachingHomeMonthSummary {
  const lines: string[] = [];

  if (input.totalThisMonth > 0) {
    const pct = Math.round((input.completedThisMonth / input.totalThisMonth) * 100);
    lines.push(
      `${input.completedThisMonth} of ${input.totalThisMonth} monthly actions complete (${pct}%).`
    );
  } else {
    lines.push('No monthly actions on your board yet — they appear after your growth plan is approved.');
  }

  if (input.proposedFixCount > 0) {
    lines.push(
      `${input.proposedFixCount} marketing fix${input.proposedFixCount === 1 ? '' : 'es'} waiting for coach approval before they become tasks.`
    );
  } else if (input.profileReady && !input.marketingHasPack) {
    lines.push('Build your marketing pack when you are ready — ranked fixes flow here after coach approval.');
  } else if (input.marketingHasPack && input.proposedFixCount === 0) {
    lines.push('Marketing pack is up to date — check actions for coach-approved fixes.');
  }

  if (input.nextActionTitle) {
    lines.push(`Next up: ${input.nextActionTitle}`);
  }

  const attention =
    input.proposedFixCount > 0 ||
    (input.totalThisMonth > 0 && input.completedThisMonth < input.totalThisMonth);
  const good =
    input.totalThisMonth > 0 && input.completedThisMonth === input.totalThisMonth && input.proposedFixCount === 0;

  return {
    headline: 'This month at a glance',
    lines,
    tone: good ? 'good' : attention ? 'attention' : 'neutral',
  };
}