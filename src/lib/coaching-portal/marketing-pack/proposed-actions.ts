/**
 * GP-634: each ranked fix becomes a proposed coaching action. A proposed action is not on the
 * member's to-do list until the coach approves it; the coach may decline it instead.
 */
import type { MarketingFix } from './types';

export const MARKETING_ACTION_GOAL_PREFIX = 'marketing-pack:';

export type ProposedActionInput = {
  title: string;
  description: string;
  status: 'proposed';
  priority: 'high' | 'medium' | 'low';
  goalId: string;
  sortOrder: number;
};

export type CoachDecision = 'approve' | 'decline';

export function fixesToProposedActions(fixes: MarketingFix[]): ProposedActionInput[] {
  return fixes.map((fix, i) => ({
    title: fix.title.slice(0, 500),
    description: `${fix.why}\n\nHow: ${fix.how}`.slice(0, 4000),
    status: 'proposed',
    priority: fix.impact === 3 ? 'high' : fix.impact === 2 ? 'medium' : 'low',
    goalId: `${MARKETING_ACTION_GOAL_PREFIX}${fix.id}`.slice(0, 120),
    sortOrder: i,
  }));
}

/** Only a still-proposed action can be reviewed, and only once. */
export function decideCoachReview(
  currentStatus: string,
  decision: CoachDecision
): { ok: true; status: 'todo' | 'declined' } | { ok: false; reason: 'not_proposed' } {
  if (currentStatus !== 'proposed') return { ok: false, reason: 'not_proposed' };
  return { ok: true, status: decision === 'approve' ? 'todo' : 'declined' };
}
