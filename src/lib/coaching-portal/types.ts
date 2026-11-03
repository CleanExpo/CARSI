export type CoachingActionStatus =
  | 'todo'
  | 'in_progress'
  | 'done'
  | 'blocked'
  /** GP-634: suggested (e.g. from the marketing pack), waiting for the coach to approve. */
  | 'proposed'
  /** GP-634: the coach declined a proposed action. */
  | 'declined';

/** Statuses a member may set themselves; proposed/declined are coach-only. */
export const MEMBER_SETTABLE_ACTION_STATUSES = ['todo', 'in_progress', 'done', 'blocked'] as const;
export type MemberSettableActionStatus = (typeof MEMBER_SETTABLE_ACTION_STATUSES)[number];

export type CoachingMonthlyAction = {
  id: string;
  title: string;
  status: CoachingActionStatus;
};

export type CoachingPortalWorkspace = {
  horizontalSummary: string;
  directionSummary: string;
  sessionPrepNotes: string;
  monthlyActions: CoachingMonthlyAction[];
};

export const EMPTY_COACHING_PORTAL_WORKSPACE: CoachingPortalWorkspace = {
  horizontalSummary: '',
  directionSummary: '',
  sessionPrepNotes: '',
  monthlyActions: [],
};
